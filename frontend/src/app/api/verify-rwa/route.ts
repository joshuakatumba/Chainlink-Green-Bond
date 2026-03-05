import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { documentText } = await req.json();

        if (!documentText) {
            return NextResponse.json(
                { error: 'Document text is required' },
                { status: 400 }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'Server configuration error: Gemini API key missing' },
                { status: 500 }
            );
        }

        const ai = new GoogleGenAI({ apiKey: apiKey });

        // We'll prompt the model to act as a document verifier and return an assessment
        // including an AI confidence score.
        const prompt = `
      You are a legal document verification AI for a Real World Asset (RWA) tokenization protocol.
      Analyze the following document and determine its authenticity, completeness, and validity for tokenization.
      
      Document to analyze:
      """
      ${documentText}
      """
      
      Respond strictly in the following JSON format:
      {
        "isValid": boolean (true if the document seems like a valid asset, false otherwise),
        "confidenceScore": number (between 0.0 and 1.0 representing your confidence in this assessment),
        "summary": "a brief 1-sentence summary of the document",
        "reasoning": "a brief explanation of why you gave this score"
      }
    `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
            }
        });

        const resultText = response.text;
        if (!resultText) {
            throw new Error("No response from Gemini");
        }

        const jsonResult = JSON.parse(resultText);

        return NextResponse.json(jsonResult);

    } catch (error) {
        console.error('Error verifying document with Gemini:', error);
        return NextResponse.json(
            { error: 'Failed to verify document' },
            { status: 500 }
        );
    }
}
