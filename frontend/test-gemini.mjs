import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

const env = fs.readFileSync('.env', 'utf-8');
const keyMatch = env.split('\n').find(line => line.startsWith('GEMINI_API_KEY='));
const key = keyMatch ? keyMatch.split('=')[1].trim() : '';

const ai = new GoogleGenAI({ apiKey: key });

async function run() {
    const modelsToTest = ['gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro', 'models/gemini-1.5-flash'];
    for (const model of modelsToTest) {
        try {
            const response = await ai.models.generateContent({
                model,
                contents: 'reply with just "ok"',
            });
            console.log(`[PASS] ${model}: ${response.text.trim()}`);
        } catch (e) {
            console.error(`[FAIL] ${model}: ${e.message}`);
        }
    }
}
run();
