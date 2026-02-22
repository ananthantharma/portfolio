import {GoogleGenerativeAI} from '@google/generative-ai';
import {NextApiRequest, NextApiResponse} from 'next';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({error: 'Method not allowed'});
  }

  try {
    await getServerSession(req, res, authOptions);
    // Check keys
    const hasGoogleKey = !!process.env.GOOGLE_API_KEY;
    const hasGeminiKey = !!process.env.Gemini_Key;

    if (!hasGoogleKey && !hasGeminiKey) {
      console.error('Missing Gemini API Keys in environment variables');
      return res.status(503).json({error: 'Server configuration error: Gemini API Key not configured.'});
    }

    const {text, options} = req.body;

    if (!text) {
      return res.status(400).json({error: 'No text provided'});
    }

    const departments = options?.departments?.join(', ') || 'IT, HR, Finance, Marketing, Legal, Ops';
    const categoryLeads = options?.categoryLeads?.join(', ') || 'Use any identified name';

    const apiKey = process.env.GOOGLE_API_KEY || process.env.Gemini_Key;
    const genAI = new GoogleGenerativeAI(apiKey!);
    const model = genAI.getGenerativeModel({model: 'gemini-flash-latest'});

    const prompt = `
        You are an expert Data Entry AI for a Procurement System.
        The user has pasted text that represents a "Sourcing Event".

        **YOUR GOAL**: extract data into the JSON structure below.

        **CRITICAL - STRICT DROPDOWN MATCHING**:
        - **Department**: Must match one of these EXACTLY if possible: [${departments}]
        - **Category Lead**: Must match one of these EXACTLY if possible: [${categoryLeads}]
          - If the exact name is not found, return the closest match or the raw name.

        **COLUMN MAPPING (If Tab-Separated/Excel Row)**:
        - **Event Name**: Column 4
        - **Vendor**: Column 5
        - **Value**: Column 9
        - **Category Lead**: Column 16
        - **Notes**: Column 19

        **Target JSON Structure**:
        {
            "eventName": "string",
            "description": "string",
            "department": "string (Start with explicit match, otherwise infer)",
            "estimatedContractValue": "number",
            "categoryLead": "string",
            "primaryLead": "string",
            "vendor": "string",
            "needDate": "string (YYYY-MM-DD)",
            "riskLevel": "Low | Medium | High",
            "sourcingStatus": "Active",
            "notes": "string"
        }

        **Input Text**:
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
      console.error('JSON Parse Error', textResponse);
      return res.status(500).json({error: 'Failed to parse AI response', raw: textResponse});
    }
  } catch (error: any) {
    console.error('Parse error details:', error);
    return res.status(500).json({
      error: 'AI Processing Failed',
      details: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
}
