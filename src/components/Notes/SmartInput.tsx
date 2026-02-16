import React, { useState, useEffect } from 'react';
import { SparklesIcon, CalendarIcon, FlagIcon } from '@heroicons/react/24/outline';

interface SmartInputProps {
    onAdd: (task: { title: string; priority: string; dueDate: Date | null }) => void;
    isProcessing?: boolean;
}

const SmartInput: React.FC<SmartInputProps> = ({ onAdd, isProcessing }) => {
    const [input, setInput] = useState('');
    const [preview, setPreview] = useState<{ priority: string; dueDate: Date | null }>({ priority: 'None', dueDate: null });

    useEffect(() => {
        // Simple regex parsing for preview
        const lower = input.toLowerCase();
        let priority = 'None';
        let dueDate: Date | null = null;

        if (lower.includes('urgent') || lower.includes('high priority') || lower.includes('ASAP')) priority = 'High';
        else if (lower.includes('medium priority')) priority = 'Medium';
        else if (lower.includes('low priority')) priority = 'Low';

        const today = new Date();
        if (lower.includes('tomorrow')) {
            dueDate = new Date(today);
            dueDate.setDate(today.getDate() + 1);
        } else if (lower.includes('today')) {
            dueDate = new Date(today);
        } else if (lower.includes('next week')) {
            dueDate = new Date(today);
            dueDate.setDate(today.getDate() + 7);
        }

        setPreview({ priority, dueDate });
    }, [input]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        // Clean title (remove keywords like "high priority")
        let title = input;
        // Basic cleaning, can be improved or left as is for "natural" feel
        // title = title.replace(/high priority/i, '').replace(/tomorrow/i, ''); 

        onAdd({
            title: title,
            priority: preview.priority,
            dueDate: preview.dueDate
        });
        setInput('');
    };

    return (
        <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500">
                <SparklesIcon className="h-5 w-5" />
            </div>
            <input
                type="text"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm placeholder:text-gray-400"
                placeholder="Add a task... (e.g., 'Finish report tomorrow high priority')"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isProcessing}
            />
            {input && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-xs text-gray-500 bg-white/80 px-2 py-1 rounded-md border border-gray-100 shadow-sm animate-in fade-in slide-in-from-left-2">
                    {preview.dueDate && (
                        <span className="flex items-center gap-1 text-indigo-600">
                            <CalendarIcon className="h-3 w-3" />
                            {preview.dueDate.toLocaleDateString(undefined, { weekday: 'short' })}
                        </span>
                    )}
                    {preview.priority !== 'None' && (
                        <span className={`flex items-center gap-1 ${preview.priority === 'High' ? 'text-red-600' :
                                preview.priority === 'Medium' ? 'text-amber-600' : 'text-green-600'
                            }`}>
                            <FlagIcon className="h-3 w-3" />
                            {preview.priority}
                        </span>
                    )}
                    <span className="text-[10px] text-gray-300">Produce of AI</span>
                </div>
            )}
        </form>
    );
};

export default SmartInput;
