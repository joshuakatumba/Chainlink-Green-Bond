import { GoogleGenAI } from '@google/genai';
require('dotenv').config({ path: '.env' });

async function run() {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: 'Hello',
        });
        console.log('Success with gemini-1.5-flash:', response.text);
    } catch (e) {
        console.error('Error with gemini-1.5-flash:', e.message);
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'Hello',
        });
        console.log('Success with gemini-2.5-flash:', response.text);
    } catch (e) {
        console.error('Error with gemini-2.5-flash:', e.message);
    }
}

run();
