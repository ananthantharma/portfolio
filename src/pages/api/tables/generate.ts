import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextApiRequest, NextApiResponse } from 'next';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt, image, apiKey } = req.body;

    // Use provided key or fallback to env
    const keyToUse = apiKey || process.env.GOOGLE_API_KEY;

    if (!keyToUse) {
        return res.status(400).json({ error: 'API Key is required' });
    }

    try {
        const genAI = new GoogleGenerativeAI(keyToUse);
        const model = genAI.getGenerativeModel({
            model: 'gemini-flash-latest',
            generationConfig: {
                responseMimeType: 'application/json',
            }
        });

        const systemPrompt = `
      You are an expert data structuring assistant. 
      Your task is to convert the user's input (text or image) into a structured format compatible with a specific hierarchical table application.
      
      The structure consists of Columns and Rows.
      
      Return a JSON object with this exact schema:
      {
        "columns": [
          { "id": "string", "label": "string", "type": "text" | "date" | "status" | "currency", "width": number }
        ],
        "rows": [
          {
            "id": "string",
            "type": "stream" | "task",
            "isExpanded": boolean (usually true for streams),
            "data": { "key": "value" },
            "children": [] (recursive array of rows)
          }
        ]
      }
      
      Rules:
      1. Always include a column with id "name" for the main task/activity name. Label it "Activity" or "Name".
      2. Infer meaningful columns types from the data (e.g. if you see dates, make a date column).
      3. For "status" or "risk" columns, try to map values to: green, yellow, red, orange, gray if possible, but the app handles any string.
      4. Structure the rows hierarchically if the data suggests it (e.g. Project -> Tasks).
      5. "data" keys MUST match column "id"s.
      6. Use type='stream' for top level items, and 'task' for children.
      7. Return ONLY raw JSON.
    `;

        const parts: any[] = [systemPrompt, prompt || "Analyze this data"];

        if (image) {
            // image is { base64: string, mimeType: string }
            parts.push({
                inlineData: {
                    data: image.base64,
                    mimeType: image.mimeType,
                },
            });
        }

        const result = await model.generateContent(parts);
        const response = await result.response;
        const text = response.text();

        // Clean markdown code blocks if present
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const json = JSON.parse(cleanText);
            res.status(200).json({ success: true, data: json });
        } catch (e) {
            console.error("JSON Parse Error", e, cleanText);
            res.status(500).json({ success: false, error: 'Failed to parse model output', raw: cleanText });
        }

    } catch (error: any) {
        console.error('Gemini API Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
