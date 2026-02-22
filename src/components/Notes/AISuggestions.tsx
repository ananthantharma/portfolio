import React, {useState} from 'react';
import {SparklesIcon, ListBulletIcon} from '@heroicons/react/24/outline';

interface AISuggestionsProps {
  taskTitle: string;
  onAccept: (subtasks: string[]) => void;
}

const AISuggestions: React.FC<AISuggestionsProps> = ({taskTitle, onAccept}) => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleGenerate = async () => {
    if (!taskTitle) return;
    setLoading(true);
    try {
      const res = await fetch('/api/gemini/todo-features', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'breakdown', text: taskTitle}),
      });
      const data = await res.json();
      if (data.success) setSuggestions(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!taskTitle) return null;

  return (
    <div className="mt-2">
      {suggestions.length === 0 ? (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 transition-colors">
          <SparklesIcon className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Generating steps...' : 'Break down with AI'}
        </button>
      ) : (
        <div className="bg-indigo-50/50 rounded-lg p-3 border border-indigo-100 animate-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-indigo-800 flex items-center gap-1">
              <SparklesIcon className="h-3 w-3" /> AI Suggestions
            </span>
            <button
              type="button"
              onClick={() => {
                onAccept(suggestions);
                setSuggestions([]);
              }}
              className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700">
              Add All
            </button>
          </div>
          <ul className="space-y-1">
            {suggestions.map((s, i) => (
              <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                <ListBulletIcon className="h-3 w-3 mt-0.5 text-indigo-400" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AISuggestions;
