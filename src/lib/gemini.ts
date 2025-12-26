import { GoogleGenerativeAI } from '@google/generative-ai';

export const initGemini = (apiKey: string) => {
  return new GoogleGenerativeAI(apiKey);
};

export const getChatResponse = async (
  apiKey: string,
  history: { role: 'user' | 'model'; parts: string }[],
  message: string,
  modelName: string = 'gemini-2.5-flash',
  systemInstruction?: string,
  baseUrl?: string,
) => {
  const genAI = initGemini(apiKey);
  interface GeminiModelParams {
    model: string;
    systemInstruction?: string;
  }

  const modelOptions: GeminiModelParams = {
    model: modelName,
    systemInstruction: systemInstruction,
  };

  interface GeminiRequestOptions {
    baseUrl?: string;
  }

  const requestOptions: GeminiRequestOptions = {};
  if (baseUrl) {
    requestOptions.baseUrl = baseUrl;
  }

  const model = genAI.getGenerativeModel(modelOptions, requestOptions);

  const chat = model.startChat({
    history: history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.parts }],
    })),
  });

  const result = await chat.sendMessage(message);
  const response = await result.response;
  return response.text();
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
  // Using gemini-2.0-flash-exp as requested (or fallback to 1.5-flash if needed)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `
    Analyze this image of a financial document (invoice, bill, receipt, statement, notice, etc.). Extract the following details in JSON format:
    {
      "vendorName": "Name of the business/vendor (e.g. Toronto Water, Rogers, Enbridge)",
      "vendorAddress": "Address if available",
      "date": "Document date (Invoice Date, Statement Date, Notice Date) in YYYY-MM-DD",
      "dueDate": "Due date if available (YYYY-MM-DD)",
      "amount": number (Total Amount, Balance Due, or Overdue Amount),
      "tax": number (total tax amount, e.g. GST/HST/PST/VAT if visible),
      "currency": "Currency code (e.g. CAD, USD) - Default to CAD if looking like a Canadian bill",
      "description": "Brief summary of items (e.g. 'Overdue Notice', 'Water Bill')",
      "gstNumber": "GST/HST/Business Number if available",
      "category": "Suggested category from: Utilities, Groceries, Dining, Entertainment, Transportation, Housing, Insurance, Medical, Business, Other"
    }
    Return ONLY raw JSON. If some fields are missing, return null or empty string.
  `;

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: mimeType
    },
  };

  const result = await model.generateContent([prompt, imagePart]);
  const response = await result.response;
  return response.text();
};
