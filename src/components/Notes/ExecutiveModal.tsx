import {Dialog, Transition} from '@headlessui/react';
import {ArrowPathIcon, ClipboardDocumentIcon, XMarkIcon} from '@heroicons/react/24/outline';
import React, {Fragment, memo, useState} from 'react';

interface ExecutiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert?: (text: string) => void;
}

const SYSTEM_PROMPT = `Role: You are a strategic executive communications expert. Your task is to rewrite my draft email using the "2-Minute Revolution" framework, designed to persuade busy decision-makers.

Strategic Guidelines:

Focus on the Audience: Frame the entire message around the decision-maker, not me. Think about what they need to hear to say "yes."

Address Their Preoccupations: Busy decision-makers care about four things: 1) Not breaking rules, 2) Resources (budgets/people), 3) Politics, and 4) Time. Frame your points to alleviate these concerns.

Cut the Fluff: Accept that I know too much. Only present what they must know, not what I think they need to know. Every single word must support the ultimate ask.

Keep it Simple: Use top-level facts only—no deep-level detail. Use everyday, active language (zero passive voice or "bafflegab"). Be highly suspicious of any word with more than 8 letters; use shorter, simpler words wherever possible.

Structural Requirements (You must follow this exact order):

The ASK: Open with exactly one clear, direct sentence stating what I need.

The Three Key Points: Provide exactly three bullet points. Each point must be exactly one sentence long.

The Details: Provide three short paragraphs corresponding to the three points above.

On my first point... (Maximum 75 words)

On my second point... (Maximum 75 words)

On my third point... (Maximum 75 words)

The Re-ASK: Conclude the email by repeating the opening "ASK" word-for-word.

Here is the draft email I need you to rewrite using these exact rules:`;

const ExecutiveModal: React.FC<ExecutiveModalProps> = memo(({isOpen, onClose, onInsert}) => {
  const [draftEmail, setDraftEmail] = useState('');
  const [rewrittenText, setRewrittenText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleRewrite = async () => {
    if (!draftEmail.trim()) {
      alert('Please paste a draft email first.');
      return;
    }

    setIsGenerating(true);
    setRewrittenText('');

    const fullPrompt = `${SYSTEM_PROMPT}\n\n"${draftEmail}"`;

    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          prompt: fullPrompt,
          model: 'gemini-flash-latest',
          apiKey: 'MANAGED',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setRewrittenText(`Error: ${data.details || 'Unknown error'}`);
      } else {
        setRewrittenText(data.text || 'No response generated.');
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
                  <h3 className="text-xl font-bold text-gray-900">Executive Email Assistant</h3>
                  <button className="text-gray-400 hover:text-gray-600" onClick={onClose}>
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left Column: Input */}
                  <div className="w-full lg:w-1/2 space-y-4 flex flex-col">
                    <label className="text-sm font-medium text-gray-700 block">Draft Email</label>
                    <p className="text-xs text-gray-500">
                      Paste your draft email here. The AI will rewrite it using the "2-Minute Revolution" framework for
                      busy executives.
                    </p>
                    <textarea
                      className="w-full flex-1 min-h-[300px] p-4 bg-gray-50 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none"
                      placeholder="Paste your draft email here..."
                      value={draftEmail}
                      onChange={e => setDraftEmail(e.target.value)}
                    />
                    <button
                      className="w-full flex justify-center items-center gap-2 rounded-md bg-indigo-600 px-4 py-3 text-white font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      disabled={isGenerating || !draftEmail.trim()}
                      onClick={handleRewrite}>
                      {isGenerating ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : 'Process Email'}
                    </button>
                  </div>

                  {/* Right Column: Output */}
                  <div className="w-full lg:w-1/2 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-700">Executive Summary Output</label>
                      {rewrittenText && (
                        <button
                          className="text-xs flex items-center gap-1 text-gray-500 hover:text-indigo-600"
                          onClick={copyToClipboard}>
                          <ClipboardDocumentIcon className="h-4 w-4" /> Copy
                        </button>
                      )}
                    </div>

                    <div className="flex-1 p-4 bg-white rounded-lg border-2 border-indigo-100 min-h-[300px] text-sm text-gray-800 shadow-sm relative overflow-y-auto whitespace-pre-wrap">
                      {isGenerating ? (
                        <div className="absolute inset-0 flex items-center justify-center text-indigo-500 animate-pulse">
                          Processing draft using 2-Minute Revolution framework...
                        </div>
                      ) : (
                        rewrittenText || 'Processed email will appear here.'
                      )}
                    </div>

                    {rewrittenText && (
                      <div className="flex justify-end gap-3 mt-2">
                        <button
                          className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                          onClick={onClose}>
                          Cancel
                        </button>
                        {onInsert && (
                          <button
                            className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-md font-medium"
                            onClick={() => {
                              if (rewrittenText) onInsert(rewrittenText);
                              onClose();
                            }}>
                            Insert into Note
                          </button>
                        )}
                      </div>
                    )}
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

export default ExecutiveModal;
