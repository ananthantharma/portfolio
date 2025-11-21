import React, { useState } from 'react';
import { Key } from 'lucide-react';

interface ApiKeyInputProps {
    onApiKeySubmit: (key: string) => void;
}

export function ApiKeyInput({ onApiKeySubmit }: ApiKeyInputProps) {
    const [key, setKey] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (key.trim()) {
            onApiKeySubmit(key.trim());
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900 text-zinc-100 p-4">
            <div className="w-full max-w-md bg-zinc-800 rounded-xl shadow-xl p-8 border border-zinc-700">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-500/10 rounded-full mb-6 mx-auto">
                    <Key className="w-6 h-6 text-blue-500" />
                </div>

                <h2 className="text-2xl font-bold text-center mb-2">Enter API Key</h2>
                <p className="text-zinc-400 text-center mb-8 text-sm">
                    To use this chat, you need to provide your Google Gemini API key.
                    It will be stored locally in your browser.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="apiKey" className="block text-sm font-medium text-zinc-300 mb-1">
                            API Key
                        </label>
                        <input
                            type="password"
                            id="apiKey"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-zinc-100 placeholder-zinc-600"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800"
                    >
                        Start Chatting
                    </button>
                </form>

                <p className="mt-6 text-xs text-center text-zinc-500">
                    Don't have a key? <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Get one here</a>
                </p>
            </div>
        </div>
    );
}
