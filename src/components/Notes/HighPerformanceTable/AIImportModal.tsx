import React, { Fragment, useState, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import axios from 'axios';

interface AIImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (data: { columns: any[]; rows: any[] }) => void;
}

export default function AIImportModal({ isOpen, onClose, onImport }: AIImportModalProps) {
    const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
    const [textInput, setTextInput] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        setImagePreview(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                    setActiveTab('image');
                }
            }
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload: any = {
                prompt: textInput,
            };

            if (activeTab === 'image' && imagePreview) {
                const base64 = imagePreview.split(',')[1];
                const mimeType = imagePreview.split(',')[0].match(/:(.*?);/)?.[1];
                payload.image = { base64, mimeType };
                payload.prompt = textInput || "Convert this image into a table structure.";
            }

            const res = await axios.post('/api/tables/generate', payload);

            if (res.data.success) {
                onImport(res.data.data);
                onClose();
            }
        } catch (e) {
            alert("Failed to generate table. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Transition.Root show={isOpen} as={Fragment}>
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
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-start sm:pt-20 sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-xl sm:p-6">
                                {/* Close Button */}
                                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                                    <button
                                        type="button"
                                        className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>

                                <div className="w-full">
                                    <h3 className="text-base font-semibold leading-6 text-gray-900 mb-4">
                                        AI Table Generator (Gemini Flash)
                                    </h3>

                                    {/* Tabs */}
                                    <div className="border-b border-gray-200 mb-4">
                                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                                            <button
                                                onClick={() => setActiveTab('text')}
                                                className={clsx(
                                                    activeTab === 'text'
                                                        ? 'border-indigo-500 text-indigo-600'
                                                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                                                    'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium'
                                                )}
                                            >
                                                Text Input
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('image')}
                                                className={clsx(
                                                    activeTab === 'image'
                                                        ? 'border-indigo-500 text-indigo-600'
                                                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                                                    'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium'
                                                )}
                                            >
                                                Image / Screenshot
                                            </button>
                                        </nav>
                                    </div>

                                    {/* Content */}
                                    <div className="mt-2" onPaste={handlePaste}>
                                        {activeTab === 'text' ? (
                                            <textarea
                                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                                rows={8}
                                                placeholder="Paste your data or explain what table you want..."
                                                value={textInput}
                                                onChange={(e) => setTextInput(e.target.value)}
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10">
                                                {imagePreview ? (
                                                    <div className="relative w-full">
                                                        <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto rounded-md shadow-sm" />
                                                        <button
                                                            onClick={() => { setImagePreview(null); }}
                                                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow hover:bg-red-600"
                                                        >
                                                            <XMarkIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="text-center">
                                                        <PhotoIcon className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                                                        <div className="mt-4 flex text-sm leading-6 text-gray-600 justify-center">
                                                            <label
                                                                htmlFor="file-upload"
                                                                className="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
                                                            >
                                                                <span>Upload a file</span>
                                                                <input id="file-upload" name="file-upload" type="file" className="sr-only" ref={fileInputRef} onChange={handleFileChange} accept="image/*" />
                                                            </label>
                                                            <p className="pl-1">or drag and drop</p>
                                                        </div>
                                                        <p className="text-xs leading-5 text-gray-600">PNG, JPG, GIF (or paste directly)</p>
                                                    </div>
                                                )}
                                                <div className="mt-4 w-full">
                                                    <label className="block text-sm font-medium leading-6 text-gray-900">Optional Context</label>
                                                    <input
                                                        type="text"
                                                        className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                                        placeholder="Add instructions (e.g. 'Extract only the totals')"
                                                        value={textInput}
                                                        onChange={(e) => setTextInput(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                        <button
                                            type="button"
                                            className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2 disabled:opacity-50"
                                            onClick={handleSubmit}
                                            disabled={loading}
                                        >
                                            {loading ? 'Generating...' : 'Generate Table'}
                                        </button>
                                        <button
                                            type="button"
                                            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                                            onClick={onClose}
                                            disabled={loading}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}
