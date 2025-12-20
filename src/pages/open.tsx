import {useCallback, useEffect, useState} from 'react';

import Page from '../components/Layout/Page';
import {OpenAIApiKeyInput} from '../components/OpenAIApiKeyInput';
import {OpenAIChatInterface} from '../components/OpenAIChatInterface';
import Header from '../components/Sections/Header';

export default function OpenPage() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedKey = localStorage.getItem('openai_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    }
    setIsLoading(false);
  }, []);

  const handleApiKeySubmit = useCallback((key: string) => {
    localStorage.setItem('openai_api_key', key);
    setApiKey(key);
  }, []);

  const handleClearKey = useCallback(() => {
    localStorage.removeItem('openai_api_key');
    setApiKey(null);
  }, []);

  if (isLoading) {
    return <div className="min-h-screen bg-zinc-900" />;
  }

  return (
    <Page description="Chat with OpenAI models" title="Ananthan's OpenAI Chat">
      <Header />
      <div className="pt-16 h-screen box-border">
        {!apiKey ? (
          <OpenAIApiKeyInput onApiKeySubmit={handleApiKeySubmit} />
        ) : (
          <div className="h-full">
            <OpenAIChatInterface apiKey={apiKey} onClearKey={handleClearKey} />
          </div>
        )}
      </div>
    </Page>
  );
}
