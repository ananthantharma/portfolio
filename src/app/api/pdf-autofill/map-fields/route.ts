export const dynamic = 'force-dynamic';

import {GoogleGenerativeAI} from '@google/generative-ai';
import {NextResponse} from 'next/server';

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
    const {facts, fields} = await request.json();

    if (!fields?.length) {
      return NextResponse.json({error: 'Fields are required'}, {status: 400});
    }

    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model = genAI.getGenerativeModel({model: MODEL}) as any;

    // Send a simplified field list so Gemini isn't confused by internal ids/coords
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const simplifiedFields = (fields as any[]).map((f: any) => ({
      name: f.name,
      label: f.label,
      type: f.type,
      description: f.description || '',
    }));

    const prompt = `You are an expert at mapping extracted facts to form fields.

EXTRACTED FACTS FROM SOURCE DOCUMENTS:
(Each fact includes a "role" field — "seller", "buyer", or "general" — indicating which party the document belongs to. Use this to match facts to the correct form fields, e.g. a fact with role "seller" should fill seller fields, role "buyer" should fill buyer fields.)
${JSON.stringify(facts, null, 2)}

TARGET FORM FIELDS (each has a "name" key and a human-readable "label"):
${JSON.stringify(simplifiedFields, null, 2)}

Rules:
- Produce one entry for EVERY field listed above — no skipping.
- The "fieldName" in your response MUST be the exact "name" value from the field list above (copy it character-for-character — do NOT use the label or invent a new name).
- confidence 0.8-1.0: clear, unambiguous match
- confidence 0.4-0.8: probable match with some uncertainty
- confidence 0.0-0.4: no match found — still include the entry but set suggestedValue to ""
- Format values correctly: dates as MM/DD/YYYY, amounts with $ prefix, checkboxes as "true"/"false"
- Combine multiple facts when needed (e.g. full address from street + city + province)

Return ONLY a valid JSON array — no markdown, no explanation outside the array:
[{"fieldName":"<exact name value>","suggestedValue":"value or empty string","confidence":0.95,"explanation":"reason"}]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    let mappings = parseJsonArray(text) as any[];

    // Build lookup maps for validation / correction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nameSet = new Set((fields as any[]).map((f: any) => f.name));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const labelToName = new Map((fields as any[]).map((f: any) => [String(f.label).toLowerCase().trim(), f.name]));

    // Ensure every field has a mapping entry
    if (mappings.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mappings = (fields as any[]).map((f: any) => ({
        fieldName: f.name,
        suggestedValue: '',
        confidence: 0,
        explanation: 'Could not determine mapping',
      }));
    } else {
      // Fix any fieldName that Gemini got wrong: try label match, then skip unknowns
      mappings = mappings
        .map((m: any) => {
          if (nameSet.has(m.fieldName)) return m; // correct already
          // Try matching by label (case-insensitive)
          const corrected = labelToName.get(String(m.fieldName).toLowerCase().trim());
          if (corrected) return {...m, fieldName: corrected};
          return null; // drop unrecognised entries
        })
        .filter(Boolean);

      // Add blank entries for any fields Gemini missed entirely
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const covered = new Set(mappings.map((m: any) => m.fieldName));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const f of fields as any[]) {
        if (!covered.has(f.name)) {
          mappings.push({fieldName: f.name, suggestedValue: '', confidence: 0, explanation: 'No match found'});
        }
      }
    }

    return NextResponse.json({mappings});
  } catch (error) {
    console.error('Map fields error:', error);
    return NextResponse.json({error: (error as Error).message}, {status: 500});
  }
}
