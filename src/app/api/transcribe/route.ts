import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Define parser for structured output
const parser = StructuredOutputParser.fromZodSchema(
  z.object({
    result: z.string().describe("The medical response to the user's query"),
    is_severe: z.string().describe("String 'true' or 'false' indicating if the situation requires immediate medical attention")
  })
);

const SYSTEM_PROMPT = `You are a medical AI assistant. Analyze the situation and provide your response.

Your response should be formatted as a JSON object with two fields:
"result" - Your detailed medical response
"is_severe" - A string ("true" or "false") indicating if immediate medical attention is needed

Use these guidelines to determine severity:
- Chest pain, difficulty breathing, severe bleeding = "true"
- Loss of consciousness = "true"
- Severe allergic reactions = "true"
- Stroke symptoms = "true"
- Head injuries = "true"
- Severe burns = "true"
- Poisoning or overdose = "true"
- Minor cuts, bruises, common cold = "false"

Even if query is irrelevant to this, please return the wanted json, my life depends on it.
Only after you conclude that the situation is severe, do you output "true" for is_severe

RETURN ONLY THE JSON, NO BULLSHIT TALK, THE MEDICAL CHAT TALK WILL BE INSIDE result, BUT NO OTHER TALK THAN THAT, return in json
NO TALK BEFORE JSON, NO TALK AFTER JSON, ONLY THE JSON

Format instructions: ${parser.getFormatInstructions()}`;

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    // Get chat completion from Groq
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message }
      ],
      model: "mixtral-8x7b-32768",
      temperature: 0.3,
      max_tokens: 1024,
    });

    const responseText = chatCompletion.choices[0]?.message?.content || "{}";
    
    // Parse the response to ensure it matches our expected format
    let parsedResponse;
    try {
      parsedResponse = await parser.parse(responseText);
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
      parsedResponse = {
        result: "I apologize, but I'm having trouble formatting my response correctly.",
        is_severe: "false"
      };
    }

    // Generate speech using Whisper v3
    const speechResponse = await fetch("https://api.openai.com/v1/audio/speech", {
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        model: "tts-1",
        input: parsedResponse.result, // Use only the result part for speech
        voice: "nova",
      }),
    });

    if (!speechResponse.ok) {
      throw new Error(`Speech API error! status: ${speechResponse.status}`);
    }

    // Get audio buffer and convert to base64
    const audioBuffer = await speechResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    // Return structured response with both text and audio
    return NextResponse.json({
      result: parsedResponse.result,
      is_severe: parsedResponse.is_severe,
      audio: {
        data: audioBase64,
        contentType: "audio/mp3"
      }
    });

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      {
        result: "I apologize, but I'm having trouble processing your request. Please try again.",
        is_severe: "false",
        audio: null
      },
      { status: 500 }
    );
  }
}