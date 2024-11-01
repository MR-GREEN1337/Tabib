import { ChatGroq } from "@langchain/groq";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { MongoClient } from "mongodb";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { BedrockEmbeddings } from "@langchain/aws";
import { CONFIG } from "@/lib/config";

const MAX_CHUNK_SIZE = 4000;
const MAX_RETRIEVED_DOCS = 3;

const parser = StructuredOutputParser.fromNamesAndDescriptions({
  result: "The medical response to the user's query",
  is_severe: "String 'true' or 'false' indicating if the situation requires immediate medical attention",
});

// Modified prompt template to include image URL in the text
const MEDICAL_PROMPT = ChatPromptTemplate.fromMessages([
  ["system", "You are a medical AI assistant. Analyze the following medical query and any provided images."],
  ["human", 
   "Context: {context}\n" +
   "Query: {input}\n" +
   "Image URL: {image_url}\n\n" +
   "Severe cases: chest pain, breathing difficulty, severe bleeding, unconsciousness, severe allergic reactions, stroke symptoms, head injuries, severe burns, poisoning.\n\n" +
   "Format: JSON with the following format:\n" +
   "  - result: \"The medical response to the user's query\",\n" +
   "  - is_severe: \"String 'true' or 'false' indicating if the situation requires immediate medical attention\"\n\n" +
   "Don't return any talk, just raw json. NOTHING ELSE!"
  ]
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

function initializeChatModel() {
  return new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "llama-3.2-90b-vision-preview",
    temperature: 0.3,
    maxTokens: 1024,
  });
}

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

    // Get relevant context from vector store
    const retrievedDocuments = await vectorStore.similaritySearch(
      messages[messages.length - 1].content || " ",
      MAX_RETRIEVED_DOCS
    );

    // Truncate context to prevent excessive length
    const context = truncateText(
      retrievedDocuments.map((doc) => doc.pageContent).join("\n"),
      MAX_CHUNK_SIZE
    );

    // Get user's last message and truncate if necessary
    const userInput = truncateText(
      messages[messages.length - 1].content || " ",
      1000
    );

    // Create the chain with the combined prompt
    const chain = RunnableSequence.from([MEDICAL_PROMPT, model, parser]);

    // Run the chain with all inputs including image URL
    const response = await chain.invoke({
      context: context,
      input: userInput,
      image_url: imageUrls?.[0] || "No image provided"
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
        result: "I apologize, but I'm having trouble processing your request. Please try again with a shorter message or fewer images.",
        is_severe: false,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
}