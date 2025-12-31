require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const models = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-001',
    'gemini-1.5-flash-002',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro',
    'gemini-pro'
];

async function testModels() {
    console.log("Testing models with API Key:", process.env.GOOGLE_API_KEY ? "Found" : "Missing");

    for (const modelName of models) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello");
            const response = await result.response;
            console.log(`✅ ${modelName}: Success`);
        } catch (error) {
            console.log(`❌ ${modelName}: Failed - ${error.message.split('Call ListModels')[0]}`);
        }
    }
}

testModels();
