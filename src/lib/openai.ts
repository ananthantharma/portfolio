export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export type MessageContent = string | ContentPart[];

export const getOpenAIChatResponse = async (
  apiKey: string,
  history: { role: 'user' | 'assistant'; content: MessageContent }[],
  message: string,
  modelName: string = 'gpt-4o',
  systemInstruction?: string,
  images?: string[]
) => {
  let userContent: MessageContent = message;

  if (images && images.length > 0) {
    userContent = [
      { type: 'text', text: message },
      ...images.map(img => ({
        type: 'image_url' as const,
        image_url: { url: img }
      }))
    ];
  }

  const messages = [
    ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
    ...history,
    { role: 'user', content: userContent },
  ];

  try {
    const response = await fetch('/api/openai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey,
        messages,
        model: modelName,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate response');
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error fetching OpenAI response:', error);
    throw error;
  }
};
