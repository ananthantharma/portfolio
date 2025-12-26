import {GoogleGenerativeAI} from '@google/generative-ai';

export const initGemini = (apiKey: string) => {
  return new GoogleGenerativeAI(apiKey);
};

export const getChatResponse = async (
  apiKey: string,
  history: {role: 'user' | 'model'; parts: string}[],
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
      parts: [{text: msg.parts}],
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
