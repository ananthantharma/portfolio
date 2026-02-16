import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { EnvelopeIcon, SparklesIcon, XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { TaskFormData } from './TaskFormModal'; // Assuming we can reuse type

interface EmailTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProceed: (data: Partial<TaskFormData>) => void;
}

const EmailTaskModal: React.FC<EmailTaskModalProps> = ({ isOpen, onClose, onProceed }) => {
    const [emailText, setEmailText] = useState('');
    const [analyzing, setAnalyzing] = useState(false);

    const handleAnalyze = async () => {
        if (!emailText.trim()) return;
        setAnalyzing(true);
        try {
            const res = await fetch('/api/gemini/email-parser', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailText })
            });
            const data = await res.json();
            if (data.success) {
                onProceed(data.data);
                onClose();
                setEmailText('');
            } else {
                alert('Failed to analyze email: ' + data.error);
            }
        } catch (error) {
            console.error(error);
            alert('Error connecting to AI');
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[60]" onClose={onClose}>
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
                            <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all border border-indigo-100">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center mb-4"
                                >
                                    <span className="flex items-center gap-2">
                                        <EnvelopeIcon className="h-5 w-5 text-indigo-600" />
                                        Create Task from Email
                                    </span>
                                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </Dialog.Title>

                                <div className="mt-2">
                                    <p className="text-sm text-gray-500 mb-3">
                                        Paste an email chain below. Gemini will extract the task details, priority, and due date for you.
                                    </p>
                                    <textarea
                                        className="w-full h-48 rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm p-3 resize-none bg-gray-50"
                                        placeholder="Paste email content here..."
                                        value={emailText}
                                        onChange={(e) => setEmailText(e.target.value)}
                                    />
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                                        onClick={onClose}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="inline-flex justify-center items-center gap-2 rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50"
                                        onClick={handleAnalyze}
                                        disabled={analyzing || !emailText.trim()}
                                    >
                                        {analyzing ? (
                                            <>
                                                <SparklesIcon className="h-4 w-4 animate-spin" />
                                                Analyzing...
                                            </>
                                        ) : (
                                            <>
                                                Analyze with AI
                                                <ArrowRightIcon className="h-4 w-4" />
                                            </>
                                        )}
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

export default EmailTaskModal;
