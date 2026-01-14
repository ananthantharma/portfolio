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

        **GUIDELINES for Extraction**:
        1. **Excel/Table Rows**: If standard table data is detected (tab-separated), try to identify columns based on content (e.g. Money = Value, Name = Lead, Date = Need Date).
        2. **Department**: Infer the Business Unit/Department if not explicit. (e.g., "Software" -> "IT", "Recruiting" -> "HR", "Audit" -> "Finance").
        3. **Leads**: Look for person names. 
           - 'Primary Lead' is often the requester or business owner.
           - 'Category Lead' is often the procurement manager.
        4. **Value**: Look for currency amounts (e.g. $50k, 50,000) for 'estimatedContractValue'.
        5. **Dates**: Convert all dates to 'YYYY-MM-DD'.
        6. **Vendor**: Look for company names (e.g., "Microsoft", "Oracle", "Agency X").

        **Target JSON Structure**:
        {
            "eventName": "string (Title of project. If missing, generate a short one from description)",
            "description": "string (Full details/scope)",
            "department": "string (IT, HR, Finance, Marketing, Legal, Ops)",
            "estimatedContractValue": "number (raw integer, no symbols)",
            "categoryLead": "string (Name)",
            "primaryLead": "string (Name)",
            "vendor": "string (Name)",
            "needDate": "string (YYYY-MM-DD)",
            "riskLevel": "Low | Medium | High (Default to Low if unknown)",
            "sourcingStatus": "Active",
            "notes": "string (Any remaining unmapped context)"
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
