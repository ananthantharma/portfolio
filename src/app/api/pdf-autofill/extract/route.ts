export const dynamic = 'force-dynamic';

import {GoogleGenerativeAI} from '@google/generative-ai';
import mammoth from 'mammoth';
import {NextResponse} from 'next/server';
import * as XLSX from 'xlsx';

const GEMINI_KEY = process.env.GEMINI_AUTOFILL_KEY || 'AIzaSyATMjc_uNPt3L1gjfPgMGN68TOxBjSqZwo';
const MODEL = 'gemini-flash-latest';

function buildExtractPrompt(roleLabel: string): string {
  const roleContext = roleLabel
    ? `IMPORTANT CONTEXT: This document belongs to the ${roleLabel.toUpperCase()}. When naming keys, prefix person-specific facts accordingly (e.g. if the document is for the Seller, use keys like seller_name, seller_address, seller_phone, seller_dob, seller_license_number, etc.).\n\n`
    : '';
  return `${roleContext}Extract all factual data points from this document as a JSON array.
Include: full names, dates, addresses, dollar amounts, phone numbers, emails, IDs, license numbers, legal descriptions, and every other concrete fact.
Use descriptive snake_case keys that reflect who the fact belongs to (e.g. seller_name, buyer_name, purchase_price, completion_date, property_address).
Return ONLY a valid JSON array, no markdown, no extra text:
[{"key": "seller_name", "value": "John Smith", "confidence": 0.95}]`;
}

function parseJsonArray(text: string): object[] {
  try {
    const m = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\[[\s\S]*\])/);
    const s = m ? m[1].trim() : text.trim();
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function extractFromFile(file: File, genAI: GoogleGenerativeAI, roleLabel: string): Promise<object[]> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = genAI.getGenerativeModel({model: MODEL}) as any;
  const prompt = buildExtractPrompt(roleLabel);

  // Spreadsheets → convert to CSV text first
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
    const workbook = XLSX.read(buffer, {type: 'buffer'});
    let textContent = '';
    workbook.SheetNames.forEach(sheetName => {
      textContent += `Sheet: ${sheetName}\n${XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName])}\n\n`;
    });
    const result = await model.generateContent(`${prompt}\n\nData:\n${textContent.substring(0, 12000)}`);
    return parseJsonArray(result.response.text());
  }

  // Word documents → extract raw text
  if (name.endsWith('.docx') || name.endsWith('.doc')) {
    const {value: textContent} = await mammoth.extractRawText({buffer});
    const result = await model.generateContent(`${prompt}\n\nDocument:\n${textContent.substring(0, 12000)}`);
    return parseJsonArray(result.response.text());
  }

  // PDFs and images → send inline to Gemini
  const mimeType = name.endsWith('.pdf') ? 'application/pdf' : name.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const result = await model.generateContent([{inlineData: {data: buffer.toString('base64'), mimeType}}, prompt]);
  return parseJsonArray(result.response.text());
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) {
      return NextResponse.json({error: 'No files provided'}, {status: 400});
    }

    const rolesRaw = formData.get('roles') as string | null;
    const roles: string[] = rolesRaw ? JSON.parse(rolesRaw) : [];

    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    const allFacts: object[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const role = roles[i] || 'general';
      const facts = await extractFromFile(file, genAI, role);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      facts.forEach((fact: any) => allFacts.push({...fact, source: file.name, role}));
    }

    return NextResponse.json({facts: allFacts});
  } catch (error) {
    console.error('Extract error:', error);
    return NextResponse.json({error: (error as Error).message}, {status: 500});
  }
}
