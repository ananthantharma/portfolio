import {Key} from 'lucide-react';
import React, {useState} from 'react';

interface OpenAIApiKeyInputProps {
  onApiKeySubmit: (key: string) => void;
}

export function OpenAIApiKeyInput({onApiKeySubmit}: OpenAIApiKeyInputProps) {
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
        <div className="flex items-center justify-center w-12 h-12 bg-green-500/10 rounded-full mb-6 mx-auto">
          <Key className="w-6 h-6 text-green-500" />
        </div>

        <h2 className="text-2xl font-bold text-center mb-2">Enter OpenAI API Key</h2>
        <p className="text-zinc-400 text-center mb-8 text-sm">
          To use this chat, you need to provide your OpenAI API key. It will be stored locally in your browser.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1" htmlFor="apiKey">
              API Key
            </label>
            <input
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-zinc-100 placeholder-zinc-600"
              id="apiKey"
              onChange={e => setKey(e.target.value)}
              placeholder="sk-..."
              required
              type="password"
              value={key}
            />
          </div>

          <button
            className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-zinc-800"
            type="submit">
            Start Chatting
          </button>
        </form>

        <p className="mt-6 text-xs text-center text-zinc-500">
          Don't have a key?{' '}
          <a
            className="text-green-400 hover:underline"
            href="https://platform.openai.com/api-keys"
            rel="noopener noreferrer"
            target="_blank">
            Get one here
          </a>
        </p>
      </div>
    </div>
  );
}
