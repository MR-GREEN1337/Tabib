import { ChatGroq } from "@langchain/groq";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { MongoClient } from "mongodb";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { BedrockEmbeddings } from "@langchain/aws";
import { CONFIG } from "@/lib/config";

const MAX_CHUNK_SIZE = 4000; // Adjust based on model's context window
const MAX_RETRIEVED_DOCS = 3; // Reduce number of retrieved documents

const parser = StructuredOutputParser.fromNamesAndDescriptions({
  result: "The medical response to the user's query",
  is_severe:
    "String 'true' or 'false' indicating if the situation requires immediate medical attention",
});

// Simplified prompt to reduce token count
const MEDICAL_PROMPT = ChatPromptTemplate.fromMessages([
  [
    "human",
    `Medical Assessment Request:
Context: {context}
Image Info: {image_descriptions}
Query: {input}

Severe cases: chest pain, breathing difficulty, severe bleeding, unconsciousness, severe allergic reactions, stroke symptoms, head injuries, severe burns, poisoning.

If user asks for image descriptions provide details using image info
Format: JSON with the following format:
  - result: "The medical response to the user's query",
  - is_severe: "String 'true' or 'false' indicating if the situation requires immediate medical attention"

  Don't return any talk, just raw json. NOITHINE ELSE! MYT LIFE DEPENDS ON IT.
`,
  ],
]);

async function initializeMongoDB() {
  const client = new MongoClient(CONFIG.mongodb.uri!);
  try {
    await client.connect();
    return client
      .db(CONFIG.mongodb.dbName)
      .collection(CONFIG.mongodb.collectionName!);
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

function initializeVectorStore(collection: any) {
  const embeddings = new BedrockEmbeddings({
    region: CONFIG.aws.region!,
    credentials: {
      accessKeyId: CONFIG.aws.credentials.accessKeyId!,
      secretAccessKey: CONFIG.aws.credentials.secretAccessKey!,
    },
    model: CONFIG.aws.embeddingModel,
  });

  return new MongoDBAtlasVectorSearch(embeddings, {
    collection,
    indexName: CONFIG.mongodb.indexName,
    textKey: CONFIG.mongodb.textKey,
    embeddingKey: CONFIG.mongodb.embeddingKey,
  });
}

// Function to compress and resize image data
function compressImageData(base64String: string): string {
  // If the base64 string is too long, we'll take a portion of it
  // This is a simplified approach - in production you might want to properly resize the image
  const maxLength = 1000; // Adjust based on your needs
  if (base64String.length > maxLength) {
    return base64String.substring(0, maxLength) + "...";
  }
  return base64String;
}

async function getImageDescriptions(model: ChatGroq, imageObjects: any[]) {
  if (!imageObjects.length) return "";

  const descriptions = await Promise.all(
    imageObjects.map(async (img, index) => {
      const compressedImage = compressImageData(img.base64);

      try {
        // Break down the request into smaller chunks if needed
        const response = await model.invoke(
          `Describe medical image ${
            index + 1
          } (compressed data: ${compressedImage}). Focus only on key visible symptoms or conditions.`
        );
        return `Image ${index + 1}: ${response.content}`;
      } catch (error) {
        console.error(`Error processing image ${index + 1}:`, error);
        return `Image ${index + 1}: Error processing image`;
      }
    })
  );

  // Combine descriptions but limit total length
  return descriptions.join("\n").substring(0, MAX_CHUNK_SIZE);
}

function initializeChatModel() {
  return new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "llama-3.2-90b-vision-preview",
    temperature: 0.3,
    maxTokens: 1024, // Reduced from 2048 to help prevent context length issues
  });
}

async function processImageForLlama(imageUrl: string) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok)
      throw new Error(`Failed to fetch image: ${response.statusText}`);

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return { base64 };
  } catch (error) {
    console.error("Image processing error:", error);
    throw error;
  }
}

// Function to truncate text while maintaining completeness
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf(".");
  return lastPeriod > 0 ? truncated.substring(0, lastPeriod + 1) : truncated;
}

export async function POST(req: Request) {
  try {
    const { messages, imageUrls } = await req.json();

    const collection = await initializeMongoDB();
    const vectorStore = initializeVectorStore(collection);
    const model = initializeChatModel();

    // Process images if present, limit to maximum of 2 images
    const processedImages =
      imageUrls?.length > 0
        ? await Promise.all(imageUrls.slice(0, 2).map(processImageForLlama))
        : [];

    // Get image descriptions with length limits
    const imageDescriptions = await getImageDescriptions(
      model,
      processedImages
    );

    // Get relevant context from vector store, but limit the amount
    const retrievedDocuments = await vectorStore.similaritySearch(
      messages[messages.length - 1].content || " ",
      MAX_RETRIEVED_DOCS
    );

    // Truncate context to prevent excessive length
    const context = truncateText(
      retrievedDocuments.map((doc) => doc.pageContent).join("\n"),
      MAX_CHUNK_SIZE
    );

    // Create main medical assessment chain
    const chain = RunnableSequence.from([MEDICAL_PROMPT, model, parser]);

    // Get user's last message and truncate if necessary
    const userInput = truncateText(
      messages[messages.length - 1].content || " ",
      1000
    );

    // Get the response
    const response = await chain.invoke({
      context: context,
      image_descriptions: imageDescriptions,
      input: userInput,
    });

    return new Response(
      JSON.stringify({
        result: response.result,
        is_severe: response.is_severe === "true",
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Medical AI Chat Error:", error);
    return new Response(
      JSON.stringify({
        result:
          "I apologize, but I'm having trouble processing your request. Please try again with a shorter message or fewer images.",
        is_severe: false,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
}
