export const dynamic = 'force-dynamic';

import {GoogleGenerativeAI} from '@google/generative-ai';
import {NextResponse} from 'next/server';
import {PDFDocument} from 'pdf-lib';

const GEMINI_KEY = process.env.GEMINI_AUTOFILL_KEY || 'AIzaSyATMjc_uNPt3L1gjfPgMGN68TOxBjSqZwo';
const MODEL = 'gemini-flash-latest';

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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf') as File;

    if (!file) {
      return NextResponse.json({error: 'No PDF provided'}, {status: 400});
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Detect AcroForm fields using pdf-lib
    let acroFields: Array<{name: string; type: string}> = [];
    let isAcroForm = false;

    try {
      const pdfDoc = await PDFDocument.load(buffer, {ignoreEncryption: true, throwOnInvalidObject: false});
      const form = pdfDoc.getForm();
      const fields = form.getFields();

      if (fields.length > 0) {
        isAcroForm = true;
        acroFields = fields.map(field => ({
          name: field.getName(),
          type: field.constructor.name.replace('PDF', '').replace('Field', '').toLowerCase(),
        }));
      }
    } catch (e) {
      console.warn('pdf-lib form detection:', e);
    }

    // Enrich with Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model = genAI.getGenerativeModel({model: MODEL}) as any;
    const base64 = buffer.toString('base64');

    let prompt: string;
    if (isAcroForm) {
      prompt = `This PDF has these AcroForm fields:\n${acroFields.map(f => `- ${f.name} (${f.type})`).join('\n')}

Analyze the PDF and return enriched info for each field.
Return ONLY valid JSON array, no markdown:
[{"name":"exact_field_name","label":"Human Readable Label","type":"text|date|amount|checkbox|signature|other","description":"what goes here","required":true}]`;
    } else {
      prompt = `Analyze this PDF form and identify ALL blanks, underlines, and boxes where data should be entered.

For each field return:
- name: camelCase identifier
- label: human-readable label from the form
- type: "text", "date", "amount", "checkbox", or "other"
- description: what information goes here
- required: true/false
- page: 0-indexed page number the field appears on
- x: horizontal position as a fraction of page width (0.0 = left edge, 1.0 = right edge) — estimate where the BLANK/UNDERLINE starts
- y: vertical position as a fraction of page height (0.0 = top, 1.0 = bottom) — estimate the vertical center of the blank

Return ONLY a valid JSON array, no markdown:
[{"name":"buyerName","label":"Buyer Full Name","type":"text","description":"Full legal names of all buyers","required":true,"page":0,"x":0.35,"y":0.18}]`;
    }

    let fields: object[] = [];
    try {
      const result = await model.generateContent([{inlineData: {data: base64, mimeType: 'application/pdf'}}, prompt]);
      fields = parseJsonArray(result.response.text());
    } catch (e) {
      console.warn('Gemini form analysis failed:', e);
    }

    // Fallback to raw acro fields if Gemini fails
    if (!fields.length && acroFields.length) {
      fields = acroFields.map(f => ({
        name: f.name,
        label: f.name.replace(/[_\\.]/g, ' '),
        type: f.type === 'checkbox' ? 'checkbox' : 'text',
        description: '',
        required: false,
      }));
    }

    return NextResponse.json({fields, isAcroForm});
  } catch (error) {
    console.error('Analyze form error:', error);
    return NextResponse.json({error: (error as Error).message}, {status: 500});
  }
}
