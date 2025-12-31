import {Dialog, Transition} from '@headlessui/react';
import {ArrowPathIcon, ClipboardDocumentIcon, XMarkIcon} from '@heroicons/react/24/outline';
import React, {Fragment, memo, useState} from 'react';

interface StandaloneRewriteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const StandaloneRewriteModal: React.FC<StandaloneRewriteModalProps> = memo(({isOpen, onClose}) => {
  // Input State
  const [inputText, setInputText] = useState('');

  // Sliders
  const [professionalism, setProfessionalism] = useState(7);
  const [directness, setDirectness] = useState(5);
  const [warmth, setWarmth] = useState(5);
  const [length, setLength] = useState(5);

  // Dropdown
  const [audience, setAudience] = useState<'Peer' | 'Senior Leadership' | 'External Vendor'>('Peer');

  // Constraints
  const [noBulletPoints, setNoBulletPoints] = useState(false);
  const [noGreetings, setNoGreetings] = useState(false);
  const [noSemicolons, setNoSemicolons] = useState(false);

  // Result
  const [isGenerating, setIsGenerating] = useState(false);
  const [rewrittenText, setRewrittenText] = useState('');

  const constructAIPrompt = () => {
    let constraints = '';
    if (noBulletPoints) constraints += '- Do not use bullet points.\\n';
    if (noGreetings) constraints += '- Start immediately without intro phrases (e.g., no "Hi", "Dear Team").\\n';
    if (noSemicolons) constraints += '- Do not use semicolons (;) or em-dashes (—).\\n';

    return `System: You are a strict text rewriting engine.
Return ONLY the rewritten text.
Do NOT include any introduction, explanation, summary, or headers.
Do NOT say "Here is the rewritten text".
Just output the result.

Task: Rewrite the following text for a [${audience}].
    
Professionalism: ${professionalism}/10
Directness: ${directness}/10
Warmth: ${warmth}/10
Length: ${length}/10

Mandatory Constraints:
${constraints}

Text to rewrite:
"${inputText}"`;
  };

  const handleRewrite = async () => {
    if (!inputText.trim()) return;

    setIsGenerating(true);
    setRewrittenText('');

    // Auto-generate prompt
    const fullPrompt = constructAIPrompt();

    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          prompt: fullPrompt,
          model: 'gemini-2.5-flash',
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
              <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <ArrowPathIcon className="h-6 w-6 text-purple-600" />
                    AI Rewrite Standalone
                  </h3>
                  <button className="text-gray-400 hover:text-gray-600" onClick={onClose}>
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 h-[600px]">
                  {/* Control Panel (Left) */}
                  <div className="w-full lg:w-1/4 space-y-6 overflow-y-auto pr-2">
                    {/* Sliders */}
                    {[
                      {
                        label: 'Professionalism',
                        val: professionalism,
                        set: setProfessionalism,
                        min: 'Casual',
                        max: 'Formal',
                      },
                      {label: 'Directness', val: directness, set: setDirectness, min: 'Soft', max: 'Blunt'},
                      {label: 'Warmth', val: warmth, set: setWarmth, min: 'Cold', max: 'Friendly'},
                      {label: 'Length', val: length, set: setLength, min: 'Concise', max: 'Index'},
                    ].map(s => (
                      <div key={s.label}>
                        <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                          <span>{s.label}</span>
                          <span>{s.val}/10</span>
                        </div>
                        <input
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          max="10"
                          min="1"
                          onChange={e => s.set(Number(e.target.value))}
                          type="range"
                          value={s.val}
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>{s.min}</span>
                          <span>{s.max}</span>
                        </div>
                      </div>
                    ))}

                    <div className="h-px bg-gray-200 my-4" />

                    {/* Audience */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Audience</label>
                      <select
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2 border"
                        onChange={e => setAudience(e.target.value as 'Peer' | 'Senior Leadership' | 'External Vendor')}
                        value={audience}>
                        <option>Peer</option>
                        <option>Senior Leadership</option>
                        <option>External Vendor</option>
                      </select>
                    </div>

                    {/* Constraints */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Constraints</label>
                      <div className="space-y-2">
                        {[
                          {label: 'No Bullet Points', checked: noBulletPoints, set: setNoBulletPoints},
                          {label: 'No Greetings', checked: noGreetings, set: setNoGreetings},
                          {label: 'No Semicolons/Dashes', checked: noSemicolons, set: setNoSemicolons},
                        ].map(c => (
                          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer" key={c.label}>
                            <input
                              checked={c.checked}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              onChange={e => c.set(e.target.checked)}
                              type="checkbox"
                            />
                            {c.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <button
                      className="w-full mt-4 flex justify-center items-center gap-2 rounded-md bg-purple-600 px-4 py-3 text-white font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-md"
                      disabled={isGenerating || !inputText.trim()}
                      onClick={handleRewrite}>
                      {isGenerating ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : 'Rewrite Text'}
                    </button>
                  </div>

                  {/* IO Panel (Right) - Split View */}
                  <div className="w-full lg:w-3/4 flex flex-col gap-4 h-full">
                    {/* Input Area */}
                    <div className="flex-1 flex flex-col min-h-0">
                      <label className="text-sm font-bold text-gray-700 mb-2 flex justify-between">
                        <span>Input Text</span>
                        <span className="text-gray-400 font-normal text-xs uppercase tracking-wide">
                          Paste content here
                        </span>
                      </label>
                      <textarea
                        className="flex-1 p-4 bg-gray-50 rounded-lg border border-gray-300 text-sm text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none leading-relaxed"
                        onChange={e => setInputText(e.target.value)}
                        placeholder="Paste your text here..."
                        value={inputText}
                      />
                    </div>

                    {/* Output Area */}
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-bold text-gray-700">Rewritten Output</label>
                        {rewrittenText && (
                          <button
                            className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-800 font-bold bg-purple-50 px-2 py-1 rounded-md"
                            onClick={copyToClipboard}>
                            <ClipboardDocumentIcon className="h-4 w-4" /> Copy to Clipboard
                          </button>
                        )}
                      </div>
                      <div className="flex-1 p-4 bg-white rounded-lg border-2 border-purple-100 text-sm text-gray-800 shadow-inner overflow-y-auto relative">
                        {isGenerating ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-purple-600 space-y-3 bg-white/80">
                            <ArrowPathIcon className="h-10 w-10 animate-spin" />
                            <span className="font-medium animate-pulse">Polishing your text...</span>
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap leading-relaxed">
                            {rewrittenText || <span className="text-gray-400 italic">Result will appear here...</span>}
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

StandaloneRewriteModal.displayName = 'StandaloneRewriteModal';
export default StandaloneRewriteModal;
