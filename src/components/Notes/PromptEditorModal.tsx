
import { Dialog, Transition } from '@headlessui/react';
import { PencilSquareIcon, XMarkIcon, PlayIcon } from '@heroicons/react/24/outline';
import React, { Fragment, useEffect, useState } from 'react';

interface PromptEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveAndRun: (prompt: string) => void;
    initialPrompt: string;
}

const PromptEditorModal: React.FC<PromptEditorModalProps> = ({ isOpen, onClose, onSaveAndRun, initialPrompt }) => {
    const [prompt, setPrompt] = useState(initialPrompt);

    useEffect(() => {
        setPrompt(initialPrompt);
    }, [initialPrompt, isOpen]);

    const handleSaveAndRun = () => {
        onSaveAndRun(prompt);
        onClose();
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center bg-purple-50 -mx-6 -mt-6 p-4 border-b border-purple-100"
                                >
                                    <div className="flex items-center gap-2 text-purple-700">
                                        <PencilSquareIcon className="h-5 w-5" />
                                        Edit Organize Prompt
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="text-gray-400 hover:text-gray-500 transition-colors"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </Dialog.Title>

                                <div className="mt-4">
                                    <p className="text-sm text-gray-500 mb-2">
                                        Customize the AI instructions below. Your changes will be saved for future use.
                                    </p>
                                    <textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        className="w-full h-96 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm font-mono whitespace-pre text-gray-800 bg-gray-50 p-3"
                                        placeholder="Enter your custom prompt here..."
                                    />
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                                        onClick={onClose}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="inline-flex justify-center items-center gap-2 rounded-md border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                                        onClick={handleSaveAndRun}
                                    >
                                        <PlayIcon className="h-4 w-4" />
                                        Save & Run
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default PromptEditorModal;
