/* eslint-disable simple-import-sort/imports */
import { Dialog, Transition } from '@headlessui/react';
import { ArrowPathIcon, CloudArrowUpIcon, DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline';
import React, { Fragment, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AssessmentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AssessmentModal: React.FC<AssessmentModalProps> = ({ isOpen, onClose }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(''); // Clear previous result
        }
    };

    const handleAnalyze = async () => {
        if (!file) return;

        setIsAnalyzing(true);
        setResult('');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('apiKey', 'GEMINI_SCOPED'); // Use the scoped key

        try {
            const response = await fetch('/api/gemini/assess', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                setResult(`Error: ${data.error || 'Failed to analyze document'}`);
            } else {
                setResult(data.text);
            }
        } catch (error) {
            console.error('Error analyzing document:', error);
            setResult('Error connecting to assessment service.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setResult('');
        onClose();
    };

    return (
        <Transition appear as={Fragment} show={isOpen}>
            <Dialog as="div" className="relative z-50" onClose={handleClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
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
                            leaveTo="opacity-0 scale-95">
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex items-center justify-between border-b pb-4 mb-4">
                                    <Dialog.Title as="h3" className="text-xl font-semibold leading-6 text-gray-900 flex items-center gap-2">
                                        <DocumentTextIcon className="h-6 w-6 text-indigo-600" />
                                        Document Assessment
                                    </Dialog.Title>
                                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-500 rounded-full p-1 hover:bg-gray-100">
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {/* Upload Section */}
                                    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 hover:bg-gray-100 transition-colors">
                                        <input
                                            accept=".pdf,.docx,.xlsx"
                                            className="hidden"
                                            id="file-upload"
                                            onChange={handleFileChange}
                                            ref={fileInputRef}
                                            type="file"
                                        />
                                        <label
                                            className="flex flex-col items-center cursor-pointer"
                                            htmlFor="file-upload"
                                        >
                                            <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mb-2" />
                                            <span className="text-sm font-medium text-gray-700">
                                                {file ? file.name : 'Click to upload PDF, Word, or Excel'}
                                            </span>
                                            <span className="text-xs text-gray-500 mt-1">
                                                Supported formats: .pdf, .docx, .xlsx
                                            </span>
                                        </label>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex justify-end">
                                        <button
                                            className={`flex items-center gap-2 rounded-md px-4 py-2 text-white font-medium transition-colors ${!file || isAnalyzing
                                                    ? 'bg-gray-400 cursor-not-allowed'
                                                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm'
                                                }`}
                                            disabled={!file || isAnalyzing}
                                            onClick={handleAnalyze}
                                        >
                                            {isAnalyzing ? (
                                                <>
                                                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                                    Analyzing...
                                                </>
                                            ) : (
                                                <>
                                                    <DocumentTextIcon className="h-5 w-5" />
                                                    Assess Document
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Results */}
                                    {result && (
                                        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-6 max-h-[60vh] overflow-y-auto">
                                            <div className="prose prose-indigo max-w-none prose-sm leading-relaxed">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default AssessmentModal;
