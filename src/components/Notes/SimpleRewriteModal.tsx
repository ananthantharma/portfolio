import {Dialog, Transition} from '@headlessui/react';
import {ArrowPathIcon, ClipboardDocumentIcon, XMarkIcon, SparklesIcon} from '@heroicons/react/24/outline';
import React, {Fragment, memo, useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SimpleRewriteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SimpleRewriteModal: React.FC<SimpleRewriteModalProps> = memo(({isOpen, onClose}) => {
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [rewrittenText, setRewrittenText] = useState('');

  const SYSTEM_PROMPT = `
Act as a professional copy editor. Please review the text below with the following goals:

Grammar & Mechanics: Fix all spelling, punctuation, and grammatical errors.

Flow & Clarity: Smooth out any awkward phrasing or run-on sentences to improve readability.

Constraints: Strictly maintain the original tone, voice, and intent of the message. Do not make changes purely for the sake of changing them; only rewrite if the current phrasing is confusing or clunky.

Here is the text:
`;

  const handleRewrite = async () => {
    if (!inputText.trim()) return;

    setIsGenerating(true);
    setRewrittenText('');

    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          prompt: `Rewrite the following text:\n\n"${inputText}"`,
          systemInstruction: SYSTEM_PROMPT,
          model: 'gemini-flash-latest',
          apiKey: 'MANAGED',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setRewrittenText(`Error: ${data.details || 'Unknown error'}`);
      } else {
        setRewrittenText(data.text ? data.text.trim() : 'No response generated.');
      }
    } catch (error) {
      setRewrittenText('Error connecting to AI.');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(rewrittenText);
    alert('Copied to clipboard!');
  };

  return (
    <Transition appear={true} as={Fragment} show={isOpen}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <SparklesIcon className="h-6 w-6 text-purple-600" />
                    Simple Rewrite
                  </h3>
                  <button className="text-gray-400 hover:text-gray-600" onClick={onClose}>
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="flex flex-col gap-6 h-[500px]">
                  {/* Input/Output Split */}
                  <div className="flex-1 flex gap-4 h-full">
                    {/* Input Area */}
                    <div className="flex-1 flex flex-col min-h-0">
                      <label className="text-sm font-bold text-gray-700 mb-2 flex justify-between">
                        <span>Input Text</span>
                      </label>
                      <textarea
                        className="flex-1 p-4 bg-gray-50 rounded-lg border border-gray-300 text-sm text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none leading-relaxed"
                        onChange={e => setInputText(e.target.value)}
                        placeholder="Paste your draft here..."
                        value={inputText}
                        autoFocus
                      />
                    </div>

                    {/* Arrow / Action */}
                    <div className="flex flex-col justify-center items-center gap-2">
                      <button
                        className="rounded-full bg-purple-600 p-3 text-white shadow-lg hover:bg-purple-700 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                        disabled={isGenerating || !inputText.trim()}
                        onClick={handleRewrite}
                        title="Rewrite">
                        {isGenerating ? (
                          <ArrowPathIcon className="h-6 w-6 animate-spin" />
                        ) : (
                          <ArrowPathIcon className="h-6 w-6" />
                        )}
                      </button>
                    </div>

                    {/* Output Area */}
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-bold text-gray-700">Result</label>
                        {rewrittenText && (
                          <button
                            className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-800 font-bold bg-purple-50 px-2 py-1 rounded-md"
                            onClick={copyToClipboard}>
                            <ClipboardDocumentIcon className="h-4 w-4" /> Copy
                          </button>
                        )}
                      </div>
                      <div className="flex-1 p-4 bg-white rounded-lg border-2 border-purple-100 text-sm text-gray-800 shadow-inner overflow-y-auto relative">
                        {isGenerating ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-purple-600 space-y-3 bg-white/80">
                            <ArrowPathIcon className="h-10 w-10 animate-spin" />
                            <span className="font-medium animate-pulse">Simplifying...</span>
                          </div>
                        ) : (
                          <div className="prose prose-sm max-w-none prose-purple">
                            {rewrittenText ? (
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{rewrittenText}</ReactMarkdown>
                            ) : (
                              <span className="text-gray-400 italic">Rewritten text will appear here...</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
});

SimpleRewriteModal.displayName = 'SimpleRewriteModal';
export default SimpleRewriteModal;
