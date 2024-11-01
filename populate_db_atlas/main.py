import os
from typing import List, Dict, Any
import asyncio
from datetime import datetime
from pymongo import MongoClient
import boto3
from botocore.config import Config
import json


# Configuration
MONGODB_URI = os.environ["MONGODB_ATLAS_URI"]
DB_NAME = os.environ["MONGODB_ATLAS_DB_NAME"]
COLLECTION_NAME = os.environ["MONGODB_ATLAS_COLLECTION_NAME"]

AWS_CONFIG = {
    "region_name": os.environ["AWS_REGION"],
    "aws_access_key_id": os.environ["AWS_ACCESS_KEY_ID"],
    "aws_secret_access_key": os.environ["AWS_SECRET_ACCESS_KEY"]
}

# Extended medical knowledge base
with open("med_data.json", "r") as f:
    MEDICAL_DATA = json.load(f)

async def get_embedding(text: str) -> List[float]:
    """Get embedding from AWS Bedrock."""
    try:
        bedrock = boto3.client(
            service_name='bedrock-runtime',
            config=Config(
                region_name=AWS_CONFIG['region_name'],
                signature_version='v4'
            ),
            aws_access_key_id=AWS_CONFIG['aws_access_key_id'],
            aws_secret_access_key=AWS_CONFIG['aws_secret_access_key']
        )

        body = json.dumps({
            "inputText": text
        })

        response = bedrock.invoke_model(
            modelId="amazon.titan-embed-text-v1",
            body=body
        )

        response_body = json.loads(response['body'].read())
        return response_body['embedding']

    except Exception as e:
        print(f"Error getting embedding: {e}")
        raise

async def process_entry(entry: Dict[str, Any]) -> Dict[str, Any]:
    """Process a single entry and add embedding."""
    embedding = await get_embedding(entry['text'])
    return {
        **entry,
        'embedding': embedding,
        'created_at': datetime.now(),
        'updated_at': datetime.now()
    }

async def process_category(category: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Process all entries in a category."""
    processed_entries = []
    for entry in category['entries']:
        entry['category'] = category['category']
        entry['subcategory'] = category['subcategory']
        processed_entry = await process_entry(entry)
        processed_entries.append(processed_entry)
    return processed_entries

async def insert_medical_data():
    """Main function to process and insert all medical data."""
    try:
        # Connect to MongoDB
        client = MongoClient(MONGODB_URI)
        db = client[DB_NAME]
        collection = db[COLLECTION_NAME]
        
        print("Connected to MongoDB")

        # Process all categories
        all_entries = []
        for category in MEDICAL_DATA["protocols"]:
            entries = await process_category(category)
            all_entries.extend(entries)

        # Insert all processed entries
        if all_entries:
            result = collection.insert_many(all_entries)
            print(f"Successfully inserted {len(result.inserted_ids)} documents")

        # Create vector search index if it doesn't exist
        existing_indexes = collection.list_indexes()
        index_exists = any(index['name'] == 'vector_index' for index in existing_indexes)

        if not index_exists:
            index_model = {
                "embedding": "vectorSearch"
            }
            collection.create_index(
                [("embedding", "vectorSearch")],
                name="vector_index",
                vectorSearchOptions={
                    "dimension": 1536,  # Titan embedding dimension
                    "similarity": "cosine"
                }
            )
            print("Created vector search index")

    except Exception as e:
        print(f"Error inserting data: {e}")
        raise

    finally:
        client.close()

def validate_environment():
    """Validate required environment variables."""
    required_vars = [
        "MONGODB_ATLAS_URI",
        "MONGODB_ATLAS_DB_NAME",
        "MONGODB_ATLAS_COLLECTION_NAME",
        "AWS_REGION",
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY"
    ]
    
    missing = [var for var in required_vars if not os.environ[var]]
    if missing:
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

if __name__ == "__main__":
    # Validate environment
    validate_environment()
    
    # Run the insertion
    asyncio.run(insert_medical_data())