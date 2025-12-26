import {NextApiRequest, NextApiResponse} from 'next';

import {TRANSACTION_CATEGORIES} from '@/lib/categories';
import {getChatResponse} from '@/lib/gemini';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({error: 'Method not allowed'});
  }

  try {
    const {transactions} = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      console.warn('Categorize API: No transactions provided');
      return res.status(400).json({error: 'Explore transactions to categorize'});
    }

    console.log(`Categorize API: Processing ${transactions.length} transactions`);

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error('Categorize API: Missing GEMINI_API_KEY or GOOGLE_API_KEY');
      return res.status(500).json({error: 'Gemini API key not configured'});
    }
    // Log masked key for verification
    console.log(`Categorize API: Using Key ID: ${apiKey.substring(0, 4)}...`);

    // Limit based on model context window and timeout risk
    // Flash-Lite can handle large context, but Vercel functions have timeouts.
    // 250 should be safe for a single batch.
    const batch = transactions.slice(0, 250);

    const prompt = `
      You are a helpful financial assistant.
      I have a list of transactions with descriptions.
      Please categorize each transaction into EXACTLY one of the following categories, AND determine if it is "Income", "Expense", or "Transfer".

      Categories:
      ${JSON.stringify(TRANSACTION_CATEGORIES)}

      Income Categories (Use positive sentiment or payroll clues):
      "Salary", "Bonuses", "Commission", "Overtime", "Rental Income", "Investment Income", "Dividends", "Capital Gains", "Side Hustle", "Child Benefits (CCB)", "Tax Refunds", "Other"

      **CRITICAL RULES & EDGE CASES (Follow strictly):**

      1. **Rental Income**:
         - IF description contains "Internet Banking E-TRANSFER", classify as **"Rental Income"** and type **"Income"**.

      2. **Insurance Split ("SECURITY NATIONAL INSU")**:
         - If multiple entries exist, the **HIGHER** amount is **"Car Insurance"**.
         - The **LOWER** amount is **"House Insurance"**.
         - If only one exists, make your best guess or default to "Car Insurance".
         - Type is **"Expense"**.

      3. **Mortgage**:
         - IF description contains "Electronic Funds Transfer MORTGAG" (or similar mortgage keywords), classify as **"Mortgage/Rent"** and type **"Expense"**.
         - Do NOT classify this as a "Transfer".

      4. **Transfers (Excluded from Spend)**:
         - Payments to Credit Cards (e.g., "Payment to VISA", "MBNA Payment").
         - Loan Repayments (Student loan, Line of credit).
         - Transfers between your own accounts.
         - Classify these as **"Transfer"** (Category can be "Transfer" or "Credit Card Payment").
         - Type MUST be **"Transfer"**.

      Input Format:
      [
        { "id": "1", "description": "WALMART STORE #123", "amount": -50.00 },
        ...
      ]

      Output Format:
      A Valid JSON object mapping ID to an Object with "category" and "type".
      Example:
      {
        "1": { "category": "Groceries", "type": "Expense" },
        "2": { "category": "Salary", "type": "Income" },
        "3": { "category": "Transfer", "type": "Transfer" }
      }

      Rules:
      1. Only use the provided categories (or "Transfer" if applicable).
      2. If uncertain, map to "Miscellaneous".
      3. Return ONLY the JSON object.
      4. "type" MUST be "Income", "Expense", or "Transfer".

      Transactions to categorize:
      ${JSON.stringify(batch.map(t => ({id: t._id, description: t.description, amount: t.amount})))}
    `;

    const responseText = await getChatResponse(
      apiKey,
      [],
      prompt,
      'gemini-3-flash-preview', // User requested model update
    );

    // Clean response of markdown if present
    const cleanJson = responseText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    let categorizationMap;
    try {
      categorizationMap = JSON.parse(cleanJson);
    } catch (e) {
      console.error('Failed to parse Gemini response', responseText);
      return res.status(500).json({error: 'Failed to parse AI response'});
    }

    res.status(200).json({categorizations: categorizationMap});
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : 'No stack';
    console.error('Categorization error details:', {message: errorMsg, stack: errorStack});

    // Return detailed error in dev mode only
    res.status(500).json({
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? errorMsg : undefined,
    });
  }
}
