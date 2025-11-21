import { GoogleGenerativeAI } from "@google/generative-ai";

export const initGemini = (apiKey: string) => {
    return new GoogleGenerativeAI(apiKey);
};

export const getChatResponse = async (apiKey: string, history: { role: "user" | "model"; parts: string }[], message: string, modelName: string = "gemini-2.5-flash", systemInstruction?: string) => {
    const genAI = initGemini(apiKey);
    const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemInstruction
    });

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
