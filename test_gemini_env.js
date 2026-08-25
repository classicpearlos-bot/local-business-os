require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function testGemini() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = 'User said "hello". Test response.';
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });
    console.log('Gemini success:', response.text);
  } catch (err) {
    console.error('Gemini error:', err);
  }
}
testGemini();
