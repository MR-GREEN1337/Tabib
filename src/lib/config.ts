// Configuration constants
export const CONFIG = {
    mongodb: {
      uri: process.env.MONGODB_ATLAS_URI,
      dbName: process.env.MONGODB_ATLAS_DB_NAME,
      collectionName: process.env.MONGODB_ATLAS_COLLECTION_NAME,
      indexName: "vector_index",
      textKey: "text",
      embeddingKey: "embedding",
    },
    aws: {
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      embeddingModel: "amazon.titan-embed-text-v1",
      chatModel: "anthropic.claude-3-sonnet-20240229-v1:0",
    },
    s3: {
      bucketName: process.env.AWS_S3_BUCKET_NAME,
    },
    chat: {
      temperature: 0.2,
      maxTokens: 1024,
    },
  } as const;
  