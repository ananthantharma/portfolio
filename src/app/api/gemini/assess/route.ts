/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import * as XLSX from 'xlsx';

import { authOptions } from '@/pages/api/auth/[...nextauth]';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const apiKeyParam = formData.get('apiKey') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Auth Check
        const session = await getServerSession(authOptions);
        if (!session || !(session.user as any).googleApiEnabled) { // Re-using permission check
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Determine Key
        let apiKey = process.env.GOOGLE_API_KEY;
        if (apiKeyParam === 'GEMINI_SCOPED') {
            apiKey = process.env.Gemini_Key;
        }

        if (!apiKey) {
            return NextResponse.json({ error: 'API Key not configured' }, { status: 500 });
        }

        // Extract Text
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        let text = '';
        const fileType = file.name.split('.').pop()?.toLowerCase();

        try {
            if (fileType === 'pdf') {
                const data = await pdfParse(buffer);
                text = data.text;
            } else if (fileType === 'docx') {
                const result = await mammoth.extractRawText({ buffer });
                text = result.value;
            } else if (fileType === 'xlsx') {
                const workbook = XLSX.read(buffer, { type: 'buffer' });
                // Extract text from all sheets
                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    text += XLSX.utils.sheet_to_txt(sheet) + '\n';
                });
            } else {
                return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
            }
        } catch (extractionError) {
            console.error('Text extraction failed:', extractionError);
            return NextResponse.json({ error: 'Failed to extract text from document.' }, { status: 500 });
        }

        if (!text || text.trim().length === 0) {
            return NextResponse.json({ error: 'No text content found in document.' }, { status: 400 });
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
${text.slice(0, 30000)} // Limit context if too large, but Gemini Flash 1.5 has large context window.
`;

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' }); // Use 1.5 flash for large context support

        const result = await model.generateContent(PROMPT);
        const response = await result.response;
        const analysisText = response.text();

        return NextResponse.json({ text: analysisText });

    } catch (error) {
        console.error('Assessment error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
