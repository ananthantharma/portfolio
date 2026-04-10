export const dynamic = 'force-dynamic';

import {NextResponse} from 'next/server';
import {
  PDFCheckBox,
  PDFDict,
  PDFDocument,
  PDFDropdown,
  PDFField,
  PDFName,
  PDFPage,
  PDFRadioGroup,
  PDFRef,
  PDFTextField,
  StandardFonts,
  rgb,
} from 'pdf-lib';

interface FieldMapping {
  fieldName: string;
  suggestedValue: string;
  confidence: number;
}

interface FormField {
  name: string;
  label: string;
  type: string;
  page?: number;
  x?: number; // fraction of page width (0–1)
  y?: number; // fraction of page height from top (0–1)
}

// ── AcroForm filling ──────────────────────────────────────────────────────────

async function fillAcroForm(pdfDoc: PDFDocument, mappings: FieldMapping[]) {
  const form = pdfDoc.getForm();
  const fieldMap = new Map<string, PDFField>();

  for (const field of form.getFields()) {
    try {
      fieldMap.set(field.getName(), field);
    } catch {
      /* skip broken */
    }
  }

  console.log('[fill] AcroForm fields found:', [...fieldMap.keys()]);

  let filled = 0;
  for (const mapping of mappings) {
    if (!mapping.suggestedValue) continue;

    // Exact match then case-insensitive fallback
    let field = fieldMap.get(mapping.fieldName);
    if (!field) {
      const lower = mapping.fieldName.toLowerCase();
      for (const [key, f] of fieldMap) {
        if (key.toLowerCase() === lower) {
          field = f;
          break;
        }
      }
    }
    if (!field) {
      console.log(`[fill] No AcroForm field matched: "${mapping.fieldName}"`);
      continue;
    }

    try {
      if (field instanceof PDFTextField) {
        field.setText(mapping.suggestedValue);
        filled++;
      } else if (field instanceof PDFCheckBox) {
        const v = mapping.suggestedValue.toLowerCase();
        v === 'true' || v === 'yes' || v === 'checked' ? field.check() : field.uncheck();
        filled++;
      } else if (field instanceof PDFDropdown) {
        const match = field.getOptions().find(o => o.toLowerCase().includes(mapping.suggestedValue.toLowerCase()));
        if (match) {
          field.select(match);
          filled++;
        }
      } else if (field instanceof PDFRadioGroup) {
        const match = field.getOptions().find(o => o.toLowerCase().includes(mapping.suggestedValue.toLowerCase()));
        if (match) {
          field.select(match);
          filled++;
        }
      }
    } catch (e) {
      console.warn(`[fill] Skipping AcroForm field "${mapping.fieldName}":`, e);
    }
  }

  console.log(`[fill] AcroForm: filled ${filled}/${mappings.length}`);
}

// ── Flat PDF text overlay ─────────────────────────────────────────────────────
// Uses PDFPage.of() to bypass the broken page catalog (getPages() fails on
// PDFs with corrupt cross-reference entries in the page tree).

async function fillFlatPDF(pdfDoc: PDFDocument, mappings: FieldMapping[], fields: FormField[]) {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Build a map of field name → field definition (with coordinates)
  const fieldDefs = new Map<string, FormField>();
  for (const f of fields) fieldDefs.set(f.name, f);

  // Discover all Page objects by scanning every indirect object in the PDF.
  // This bypasses the broken page catalog entirely.
  const pagesByIndex = new Map<number, PDFPage>();
  const pageDicts: Array<{ref: PDFRef; dict: PDFDict}> = [];

  for (const [ref, obj] of pdfDoc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFDict)) continue;
    try {
      const type = obj.get(PDFName.of('Type'));
      if (type instanceof PDFName && type.asString() === 'Page') {
        pageDicts.push({ref: ref as PDFRef, dict: obj});
      }
    } catch {
      /* skip broken objects */
    }
  }

  // Sort by object number (approximates page order in most PDFs)
  pageDicts.sort((a, b) => a.ref.objectNumber - b.ref.objectNumber);
  pageDicts.forEach(({ref, dict}, i) => {
    try {
      pagesByIndex.set(i, PDFPage.of(dict as any, ref, pdfDoc));
    } catch {
      /* skip */
    }
  });

  console.log(`[fill] Flat PDF: found ${pagesByIndex.size} pages via object scan`);

  let filled = 0;
  for (const mapping of mappings) {
    if (!mapping.suggestedValue) continue;

    const def = fieldDefs.get(mapping.fieldName);
    if (!def || def.x === undefined || def.y === undefined) {
      console.log(`[fill] No coordinates for field "${mapping.fieldName}" — skipping`);
      continue;
    }

    const pageNum = def.page ?? 0;
    const page = pagesByIndex.get(pageNum);
    if (!page) {
      console.log(`[fill] Page ${pageNum} not found`);
      continue;
    }

    try {
      const {width, height} = page.getSize();
      // Convert from fraction-of-page to PDF points (origin: bottom-left)
      const xPt = def.x * width;
      const yPt = height - def.y * height - 10; // -10 to sit just above the baseline

      page.drawText(mapping.suggestedValue, {
        x: xPt,
        y: yPt,
        size: 9,
        font,
        color: rgb(0, 0, 0.6), // blue so it's visually distinct from pre-printed text
      });
      filled++;
    } catch (e) {
      console.warn(`[fill] Could not draw "${mapping.fieldName}":`, e);
    }
  }

  console.log(`[fill] Flat PDF: overlaid ${filled}/${mappings.length} fields`);
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let buffer: Buffer | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get('pdf') as File;
    const mappingsJson = formData.get('mappings') as string;
    const isAcroFormStr = formData.get('isAcroForm') as string;
    const fieldsJson = formData.get('fields') as string | null;

    if (!file || !mappingsJson) {
      return NextResponse.json({error: 'PDF and mappings are required'}, {status: 400});
    }

    buffer = Buffer.from(await file.arrayBuffer());
    const mappings: FieldMapping[] = JSON.parse(mappingsJson);
    const isAcroForm = isAcroFormStr === 'true';
    const fields: FormField[] = fieldsJson ? JSON.parse(fieldsJson) : [];

    console.log(`[fill] isAcroForm=${isAcroForm} | mappings=${mappings.length} | fields=${fields.length}`);

    const pdfDoc = await PDFDocument.load(buffer, {ignoreEncryption: true, throwOnInvalidObject: false});

    if (isAcroForm) {
      await fillAcroForm(pdfDoc, mappings);
    } else {
      await fillFlatPDF(pdfDoc, mappings, fields);
    }

    const outputBytes = await pdfDoc.save({addDefaultPage: false});

    return new Response(outputBytes, {
      headers: {
        'Content-Disposition': 'attachment; filename="filled-form.pdf"',
        'Content-Type': 'application/pdf',
      },
    });
  } catch (error) {
    console.error('[fill] Error:', error);
    if (buffer) {
      // Always return something downloadable
      return new Response(buffer, {
        headers: {
          'Content-Disposition': 'attachment; filename="form-original.pdf"',
          'Content-Type': 'application/pdf',
        },
      });
    }
    return NextResponse.json({error: (error as Error).message}, {status: 500});
  }
}
