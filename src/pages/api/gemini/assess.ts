/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenerativeAI } from '@google/generative-ai';
import formidable from 'formidable';
import fs from 'fs';
import mammoth from 'mammoth';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import PDFParser from 'pdf2json';
import * as XLSX from 'xlsx';

import { authOptions } from '@/lib/auth';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const session = await getServerSession(req, res, authOptions);
        if (!session || !(session.user as any).googleApiEnabled) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const form = formidable({});

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [fields, files] = await form.parse(req);

        const uploadedFile = files.file?.[0];
        const apiKeyParam = fields.apiKey?.[0];

        if (!uploadedFile) {
            return res.status(400).json({ error: 'No file provided' });
        }

        let apiKey = process.env.GOOGLE_API_KEY;
        if (apiKeyParam === 'GEMINI_SCOPED') {
            apiKey = process.env.Gemini_Key;
        }

        if (!apiKey) {
            return res.status(500).json({ error: 'API Key not configured' });
        }

        const fileBuffer = fs.readFileSync(uploadedFile.filepath);
        let text = '';

        // Determine file type from original filename
        const originalFilename = uploadedFile.originalFilename || '';
        const fileType = originalFilename.split('.').pop()?.toLowerCase();

        try {
            if (fileType === 'pdf') {
                const pdfParser = new PDFParser(null, true);
                text = await new Promise((resolve, reject) => {
                    pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
                    pdfParser.on("pdfParser_dataReady", () => {
                        resolve(pdfParser.getRawTextContent());
                    });
                    pdfParser.parseBuffer(fileBuffer);
                });
            } else if (fileType === 'docx') {
                const result = await mammoth.extractRawText({ buffer: fileBuffer });
                text = result.value;
            } else if (fileType === 'xlsx') {
                const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    text += XLSX.utils.sheet_to_txt(sheet) + '\n';
                });
            } else {
                return res.status(400).json({ error: 'Unsupported file type' });
            }
        } catch (extractionError) {
            console.error('Text extraction failed:', extractionError);
            return res.status(500).json({ error: 'Failed to extract text from document.' });
        }

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: 'No text content found in document.' });
        }

        // Gemini Analysis
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
${text.slice(0, 30000)}
`;

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const result = await model.generateContent(PROMPT);
        const response = await result.response;
        const analysisText = response.text();

        return res.status(200).json({ text: analysisText });

    } catch (error) {
        console.error('Assessment error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
