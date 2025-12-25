import { NextApiRequest, NextApiResponse } from 'next';

import { TRANSACTION_CATEGORIES } from '@/lib/categories';
import { getChatResponse } from '@/lib/gemini';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { transactions } = req.body;

        if (!Array.isArray(transactions) || transactions.length === 0) {
            console.warn("Categorize API: No transactions provided");
            return res.status(400).json({ error: 'Explore transactions to categorize' });
        }

        console.log(`Categorize API: Processing ${transactions.length} transactions`);

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("Categorize API: Missing GEMINI_API_KEY");
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }
        // Log masked key for verification
        console.log(`Categorize API: Using Key ID: ${apiKey.substring(0, 4)}...`);

        // Limit batch size to 50 to avoid token limits or timeouts
        const batch = transactions.slice(0, 50);

        const prompt = `
      You are a helpful financial assistant.
      I have a list of transactions with descriptions.
      Please categorize each transaction into EXACTLY one of the following categories:
      ${JSON.stringify(TRANSACTION_CATEGORIES)}

      Income Categories (Use positive sentiment or payroll clues):
      "Salary", "Bonuses", "Commission", "Overtime", "Rental Income", "Investment Income", "Dividends", "Capital Gains", "Side Hustle", "Child Benefits (CCB)", "Tax Refunds", "Other"

      Input Format:
      [
        { "id": "1", "description": "WALMART STORE #123", "amount": 50.00 },
        ...
      ]

      Output Format:
      A Valid JSON object mapping ID to Category Name.
      Example:
      {
        "1": "Groceries",
        "2": "Gas"
      }

      Rules:
      1. Only use the provided categories.
      2. If uncertain, map to "Miscellaneous".
      3. Return ONLY the JSON object, no markdown code blocks.

      Transactions to categorize:
      ${JSON.stringify(batch.map(t => ({ id: t._id, description: t.description, amount: t.amount })))}
    `;

        const responseText = await getChatResponse(
            apiKey,
            [],
            prompt,
            'gemini-2.0-flash-lite-preview-02-05' // User requested Flash-Lite Latest
        );

        // Clean response of markdown if present
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        let categorizationMap;
        try {
            categorizationMap = JSON.parse(cleanJson);
        } catch (e) {
            console.error("Failed to parse Gemini response", responseText);
            return res.status(500).json({ error: 'Failed to parse AI response' });
        }

        res.status(200).json({ categorizations: categorizationMap });

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : 'No stack';
        console.error('Categorization error details:', { message: errorMsg, stack: errorStack });

        // Return detailed error in dev mode only
        res.status(500).json({
            error: 'Internal Server Error',
            details: process.env.NODE_ENV === 'development' ? errorMsg : undefined
        });
    }
}
