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
        You are an expert Data Entry AI for a Procurement System.
        The user has pasted text that represents a "Sourcing Event" (a project to buy goods/services).
        The text might be a row from an Excel spreadsheet (tab-separated), an email, or a rough note.

        **YOUR GOAL**: extract as much meaningful data as possible into the JSON field structure below.

        **CRITICAL - COLUMN MAPPING LOGIC (If input is a table row)**:
        If the input seems to be a tab-separated or structured row, follow these column indices (1-based index):
        - **Event Name**: Map from Column 4 (Description)
        - **Vendor(s)**: Map from Column 5
        - **Value (Estimated Contract Value)**: Map from Column 9
        - **Category Lead**: Map from Column 16
        - **Notes**: Map from Column 19

        **GENERAL GUIDELINES**:
        1. **Department**: Infer the Business Unit/Department if not explicit. (e.g., "Software" -> "IT", "Recruiting" -> "HR", "Audit" -> "Finance").
        2. **Leads**: 
           - 'Category Lead' should map from the column specified above.
           - 'Primary Lead' can be inferred if another name is present.
        3. **Value**: Clean the value from Column 9 (remove symbols) for 'estimatedContractValue'.
        4. **Dates**: Convert all dates to 'YYYY-MM-DD'.

        **Target JSON Structure**:
        {
            "eventName": "string (Column 4)",
            "description": "string (Column 4 - same as event name or more detail if available)",
            "department": "string (IT, HR, Finance, Marketing, Legal, Ops)",
            "estimatedContractValue": "number (Column 9 - raw integer)",
            "categoryLead": "string (Column 16 - Name)",
            "primaryLead": "string (Name)",
            "vendor": "string (Column 5 - Name)",
            "needDate": "string (YYYY-MM-DD)",
            "riskLevel": "Low | Medium | High (Default to Low if unknown)",
            "sourcingStatus": "Active",
            "notes": "string (Column 19)"
        }

        **Input Text to Parse**:
        ${JSON.stringify(text.slice(0, 5000))}

        **Response (Valid JSON only, no markdown)**:
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
