import { GoogleGenerativeAI } from '@google/generative-ai';

export const initGemini = (apiKey: string) => {
  return new GoogleGenerativeAI(apiKey);
};

export const getChatResponse = async (
  apiKey: string,
  history: { role: 'user' | 'model'; parts: string }[],
  message: string,
  modelName: string = 'gemini-flash-latest',
  systemInstruction?: string,
  attachments: { type: 'image' | 'pdf' | 'text'; content?: string; url?: string; name: string; mimeType?: string }[] = [],
) => {
  /*
   * Use Server-Side Generation Route (similar to OpenAI implementation)
   * This avoids client-side SDK proxy issues and keeps keys secure.
   */
  try {
    const response = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey,
        prompt: message,
        history, // Pass history to server
        model: modelName,
        systemInstruction,
        attachments, // Updated from images
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || errorData.error || 'Failed to generate content');
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error fetching Gemini response:', error);
    throw error;
  }
};

export interface GeminiModel {
  id: string;
  displayName: string;
}

export const getAvailableModels = async (apiKey: string): Promise<GeminiModel[]> => {
  if (!apiKey) return [];

  try {
    // Try v1alpha as it often contains newer/experimental models not yet in v1beta
    const response = await fetch(`/api/proxy/v1alpha/models?key=${apiKey}`);
    if (!response.ok) {
      console.warn('Failed to fetch models from v1alpha', response.statusText);
      return [];
    }
    const data = await response.json();

    if (!data.models) return [];

    interface GoogleModel {
      name: string;
      displayName: string;
      supportedGenerationMethods?: string[];
    }

    // Filter for models that support 'generateContent'
    const chatModels = data.models.filter(
      (model: GoogleModel) =>
        model.supportedGenerationMethods && model.supportedGenerationMethods.includes('generateContent'),
    );

    return chatModels.map((m: GoogleModel) => ({
      id: m.name.replace('models/', ''),
      displayName: m.displayName,
    }));
  } catch (error) {
    console.error('Error fetching models:', error);
    return [];
  }
};
export const analyzeInvoice = async (apiKey: string, base64Image: string, mimeType: string) => {
  const genAI = initGemini(apiKey);

  // Logic-Based Instruction: Mathematical Verification Rule
  const systemInstruction = `
    You are a specialized financial document extraction AI. Your goal is 100% precision.
    
    Mathematical Verification Rule:
    Before finalizing the 'amount', perform this internal check: 
    (Sum of Line Items) - (Discounts) + (Taxes) = Amount. 
    If the image shows a "Total" or "Balance Due" that matches this calculation, use that. 
    If there is a discrepancy, prioritize the figure explicitly labeled "Total" or "Balance Due".
    
    Strictly follow this extraction schema:
    - Vendor Name: Official business name.
    - Vendor Address: Full address if available.
    - Date: YYYY-MM-DD. Look for "Invoice Date", "Statement Date", or "Notice Date".
    - Due Date: YYYY-MM-DD.
    - Amount: The final PAYABLE amount.
    - Tax: Total tax amount (GST/HST/PST/VAT).
    - Currency: ISO code (e.g. CAD, USD). Default to CAD if Canadian address.
    - Description: Brief summary (e.g. "Overdue Notice", "Water Bill").
    - GST Number: Business number if visible.
  `;

  const model = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    systemInstruction: systemInstruction,
    generationConfig: {
      temperature: 0.0, // Zero creativity for data extraction
      responseMimeType: 'application/json',
    },
  });

  const prompt = `
    Extract the following details from this financial document in strict JSON format:
    {
      "vendorName": string,
      "vendorAddress": string,
      "date": string (YYYY-MM-DD),
      "dueDate": string (YYYY-MM-DD),
      "amount": number,
      "tax": number,
      "currency": string,
      "description": string,
      "gstNumber": string,
      "category": string (One of: Utilities, Groceries, Dining, Entertainment, Transportation, Housing, Insurance, Medical, Business, Other)
    }
    Return ONLY raw JSON. If a field is not found, use null.
  `;

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: mimeType,
    },
  };

  const result = await model.generateContent([prompt, imagePart]);
  const response = await result.response;
  return response.text();
};
