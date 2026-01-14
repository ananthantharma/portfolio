import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';

// Config removed to enable default bodyParser (JSON)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !(session.user as any).googleApiEnabled) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { model: requestedModel, apiKey: apiKeyParam, fileUrl, fileType, text: providedText } = req.body;
    const modelName = requestedModel || 'gemini-flash-latest';

    let apiKey = process.env.GOOGLE_API_KEY;
    if (apiKeyParam === 'GEMINI_SCOPED') {
      apiKey = process.env.Gemini_Key;
    }

    if (!apiKey) {
      return res.status(500).json({ error: 'API Key not configured' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    let promptParts: any[] = [];
    let textToAnalyze = '';

    // Case 1: PDF via Oracle URL
    if (fileType === 'pdf' && fileUrl) {
      try {
        const fetchRes = await fetch(fileUrl);
        if (!fetchRes.ok) throw new Error(`Failed to fetch PDF from ${fileUrl}`);
        const arrayBuffer = await fetchRes.arrayBuffer();
        const base64Content = Buffer.from(arrayBuffer).toString('base64');

        promptParts.push({
          inlineData: {
            data: base64Content,
            mimeType: 'application/pdf',
          }
        });
        textToAnalyze = "PDF Document (Attached)";
      } catch (err) {
        console.error("Error fetching PDF for assessment:", err);
        return res.status(500).json({ error: "Failed to retrieve PDF" });
      }
    }
    // Case 2: Text (DOCX/Excel extracted client-side)
    else if (providedText) {
      textToAnalyze = providedText;
    } else {
      return res.status(400).json({ error: "No file content provided" });
    }

    const PROMPT = `
Task: Act as a Senior Procurement Manager and Financial Analyst. Review the document provided below and perform a comprehensive analysis of the vendor quote or pricing proposal.

1. Data Extraction & Table Construction: Create a structured table that includes the following columns:
   - SKU / Product Part Number
   - Product Name & Detailed Description
   - Quantity
   - Unit Price (List price vs. Discounted price if available)
   - Total Year 1 Cost

2. Multi-Year Financial Breakdown: If this is a multi-year quote, provide a year-over-year breakdown of the costs. Calculate the Annual Increase (%) for each line item and the total contract value.

3. Executive "Leader’s Lens" Analysis: Identify and summarize the following details for my approval review:
   - One-Time vs. Recurring Costs: Clearly separate implementation/setup fees from ongoing subscription or maintenance fees.
   - Hidden Clauses: Identify any mentions of "auto-renewal," "price caps" on renewals, or "minimum commitment" shifts.
   - Payment Terms: Note the net payment terms (e.g., Net 30, Net 60) and any late fee penalties.
   - Support & SLAs: Briefly summarize the level of support included (e.g., 24/7 vs. business hours) and any Service Level Agreement (SLA) credits mentioned.
   - Red Flags/Risks: Highlight any missing information (e.g., missing expiration date for the quote) or unusual terms that deviate from industry standards.

Output Format: Please provide the table first, followed by the multi-year breakdown, and conclude with the "Leader's Lens" executive summary.

DOCUMENT CONTENT:
${textToAnalyze.slice(0, 50000)}
`;

    promptParts.push({ text: PROMPT });

    const result = await model.generateContent(promptParts);
    const response = await result.response;
    const analysisText = response.text();

    return res.status(200).json({ text: analysisText });

  } catch (error: any) {
    console.error('Assessment error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
