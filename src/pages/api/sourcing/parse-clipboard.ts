import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        await getServerSession(req, res, authOptions);
        // Check keys
        const hasGoogleKey = !!process.env.GOOGLE_API_KEY;
        const hasGeminiKey = !!process.env.Gemini_Key;

        if (!hasGoogleKey && !hasGeminiKey) {
            console.error("Missing Gemini API Keys in environment variables");
            return res.status(503).json({ error: 'Server configuration error: Gemini API Key not configured.' });
        }

        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        const apiKey = process.env.GOOGLE_API_KEY || process.env.Gemini_Key;
        const genAI = new GoogleGenerativeAI(apiKey!);
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' }); // Use flash for speed

        const prompt = `
        You are an intelligent data extraction assistant. 
        I am pasting a row of data (e.g. from Excel) or a snippet of text regarding a sourcing event. 
        Your job is to extract relevant fields into a JSON object. If you are not confident about a field, leave it null or empty string.

        Target JSON Structure:
        {
            "eventName": "string (Short title of request)",
            "description": "string (Detailed description)",
            "department": "string (e.g. IT, HR, Marketing - infer if possible)",
            "estimatedContractValue": "number (extract raw number)",
            "categoryLead": "string (Person name)",
            "primaryLead": "string (Person name)",
            "vendor": "string (Vendor name)",
            "needDate": "string (YYYY-MM-DD)",
            "riskLevel": "Low | Medium | High (Default to Low if unknown)",
            "notes": "string (Any extra context)"
        }

        Input Text:
        ${JSON.stringify(text.slice(0, 5000))}

        Response (JSON Only):
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResponse = response.text();

        // Robust JSON extraction
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : textResponse;

        try {
            const parsed = JSON.parse(jsonString);
            return res.status(200).json(parsed);
        } catch (e) {
            console.error("JSON Parse Error", textResponse);
            return res.status(500).json({ error: "Failed to parse AI response", raw: textResponse });
        }

    } catch (error: any) {
        console.error('Parse error details:', error);
        return res.status(500).json({
            error: 'AI Processing Failed',
            details: error instanceof Error ? error.message : JSON.stringify(error)
        });
    }
}
