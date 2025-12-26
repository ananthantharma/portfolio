import {NextRequest, NextResponse} from 'next/server';

import dbConnect from '@/lib/dbConnect';
import Transaction, {ITransaction} from '@/models/Transaction';

// Helper to parse numeric values from CSV strings
// Helper to properly split CSV lines respecting quotes
const splitCSV = (line: string, delimiter: string) => {
  const parts: string[] = [];
  let currentPart = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      parts.push(currentPart);
      currentPart = '';
    } else {
      currentPart += char;
    }
  }
  parts.push(currentPart);
  return parts.map(p => p.trim().replace(/^"|"$/g, '').trim());
};

const parseAmount = (str: string): number => {
  if (!str) return 0;
  return parseFloat(str.replace(/[^0-9.-]+/g, ''));
};

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({error: 'No file provided'}, {status: 400});
    }

    const text = await file.text();
    const lines = text.split('\n');

    const transactionsToSave: Partial<ITransaction>[] = [];
    let skippedCount = 0;

    for (const line of lines) {
      if (!line.trim()) continue;

      // Split by tab (based on user example) or comma
      // The example: "2025-12-22  PRESTO..." looks like tab separated
      // But user said "csv file". We'll try to detect or just handle both.
      // Given the example "2025-12-22\tPRESTO...", it strongly suggests TSV or copy-paste from Excel.
      // We'll try a regex split that handles tabs or multiple spaces if typical CSV fails?
      // Actually, standard CSV parsers might fail on tabs.
      // Let's assume standard CSV first (comma) but fall back or support tab if no commas found?
      // The user prompt example clearly had wide spaces, suggesting tabs.

      let parts = splitCSV(line, '\t');
      if (parts.length < 2) {
        // Try comma
        parts = splitCSV(line, ',');
      }

      // Expected: Date, Transaction (Desc), Debt, Credit, Card #
      // Index:    0,    1,                 2,    3,      4

      if (parts.length < 2) {
        skippedCount++;
        continue;
      }

      const dateStr = parts[0]?.trim();
      const description = parts[1]?.trim();
      const debtStr = parts[2]?.trim();
      const creditStr = parts[3]?.trim();
      const cardStr = parts[4]?.trim();

      // Basic validation
      if (!dateStr || !description) {
        // console.log('Skipping invalid line:', line);
        skippedCount++;
        continue;
      }

      const debt = parseAmount(debtStr);
      const credit = parseAmount(creditStr);

      // Skip if header row (if "Date" is in date field)
      if (dateStr.toLowerCase() === 'date') continue;

      let type: 'Income' | 'Expense' = 'Expense';
      let amount = 0;

      if (credit > 0) {
        type = 'Income';
        amount = credit;
      } else if (debt > 0) {
        type = 'Expense';
        amount = debt;
      } else {
        // No valid amount, maybe just a note or pending? Skip for now or save as 0
        // skippedCount++;
        // continue;
        // User might want to see it.
        amount = 0;
      }

      // Extract card Last 4
      // Example: "4500********1022" -> "1022"
      let cardLast4 = '';
      if (cardStr) {
        const matches = cardStr.match(/\d{4}$/); // Match last 4 digits
        if (matches) {
          cardLast4 = matches[0];
        } else {
          // Maybe it is just 4 digits?
          cardLast4 = cardStr.slice(-4);
        }
      }

      transactionsToSave.push({
        date: new Date(dateStr),
        description,
        amount,
        type,
        category: 'Uncategorized', // Default
        cardLast4,
        isRecurring: false,
      });
    }

    if (transactionsToSave.length > 0) {
      // Bulk write or loop save
      // We'll do loop to allow mongoose validation defaults
      // const created = await Transaction.insertMany(transactionsToSave);
      // insertMany is better for perf

      // However, we might want to avoid duplicates.
      // For this MVP, we will just insert all.
      await Transaction.insertMany(transactionsToSave);
    }

    return NextResponse.json({
      success: true,
      count: transactionsToSave.length,
      skipped: skippedCount,
    });
  } catch (error) {
    console.error('Error processing CSV:', error);
    return NextResponse.json({error: 'Failed to process file'}, {status: 500});
  }
}
