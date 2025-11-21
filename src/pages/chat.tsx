import { useState, useEffect } from 'react';
import { ApiKeyInput } from '../components/ApiKeyInput';
import { ChatInterface } from '../components/ChatInterface';
import Page from '../components/Layout/Page';
import Header from '../components/Sections/Header';

export default function ChatPage() {
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedKey = localStorage.getItem('gemini_api_key');
        if (storedKey) {
            setApiKey(storedKey);
        }
        setIsLoading(false);
    }, []);

    const handleApiKeySubmit = (key: string) => {
        localStorage.setItem('gemini_api_key', key);
        setApiKey(key);
    };

    const handleClearKey = () => {
        localStorage.removeItem('gemini_api_key');
        setApiKey(null);
    };

    if (isLoading) {
        return <div className="min-h-screen bg-zinc-900" />;
    }

    return (
        <Page title="Ananthan's AI Chat" description="Chat with Gemini">
            <Header />
            <div className="pt-16 h-screen box-border">
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
