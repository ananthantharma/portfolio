export const getOpenAIChatResponse = async (
  apiKey: string,
  history: {role: 'user' | 'assistant'; content: string}[],
  message: string,
  modelName: string = 'gpt-4o',
) => {
  const messages = [...history, {role: 'user', content: message}];

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
