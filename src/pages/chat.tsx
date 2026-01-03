import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

import { ApiKeyInput } from '../components/ApiKeyInput';
import { ChatInterface } from '../components/ChatInterface';
import Page from '../components/Layout/Page';
import Header from '../components/Sections/Header';

export default function ChatPage() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { data: session } = useSession();

  useEffect(() => {
    // Check for Managed Permission
    if (session?.user && (session.user as any).googleApiEnabled) {
      setApiKey('GEMINI_SCOPED');
      setIsLoading(false);
      return;
    }

    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    }
    setIsLoading(false);
  }, [session]);

  const handleApiKeySubmit = useCallback((key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
  }, []);

  const handleClearKey = useCallback(() => {
    localStorage.removeItem('gemini_api_key');
    setApiKey(null);
  }, []);

  if (isLoading) {
    return <div className="min-h-screen bg-zinc-900" />;
  }

  return (
    <Page description="Chat with Gemini" title="Ananthan's AI Chat">
      <Header />
      {/* 
        Adaptive Padding:
        - Mobile (<640px): Header hidden -> pt-0
        - Tablet/Laptop (640px - 1280px): Header likely wraps (2 rows) -> pt-32 (128px)
        - Desktop (>1280px): Header single line -> pt-20 (80px)
       */}
      <div className="pt-0 sm:pt-32 xl:pt-20 h-screen box-border">
        {!apiKey ? (
          <ApiKeyInput onApiKeySubmit={handleApiKeySubmit} />
        ) : (
          <div className="h-full">
            <ChatInterface apiKey={apiKey} onClearKey={handleClearKey} />
          </div>
        )}
      </div>
    </Page>
  );
}
