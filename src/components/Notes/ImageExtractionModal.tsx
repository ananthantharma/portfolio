import { Dialog, Transition } from '@headlessui/react';
import {
    ArrowPathIcon,
    ClipboardDocumentCheckIcon,
    ClipboardDocumentIcon,
    PhotoIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import classNames from 'classnames';
import React, { Fragment, useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ImageExtractionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ImageExtractionModal: React.FC<ImageExtractionModalProps> = React.memo(({ isOpen, onClose }) => {
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [resultText, setResultText] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setResultText('');
            setImagePreview(null);
            setError(null);
            setCopied(false);
        }
    }, [isOpen]);

    const compressImage = (base64Str: string, maxWidth = 1024, quality = 0.8): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64Str;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
        });
    };

    const handlePaste = useCallback((e: ClipboardEvent | React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault();
                const blob = item.getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                        const base64 = event.target?.result as string;
                        try {
                            // Compress immediately for preview and upload
                            const compressed = await compressImage(base64);
                            setImagePreview(compressed);
                            setError(null);
                        } catch (err) {
                            console.error("Compression failed", err);
                            setImagePreview(base64); // Fallback
                        }
                    };
                    reader.readAsDataURL(blob);
                    return; // Stop after finding the first image
                }
            }
        }
    }, []);

    // Global paste listener when modal is open and focused
    useEffect(() => {
        if (isOpen) {
            const handleGlobalPaste = (e: ClipboardEvent) => handlePaste(e);
            window.addEventListener('paste', handleGlobalPaste);
            return () => {
                window.removeEventListener('paste', handleGlobalPaste);
            };
        }
        return undefined;
    }, [isOpen, handlePaste]);

    const handleExtract = async () => {
        if (!imagePreview) {
            setError('Please paste an image first.');
            return;
        }

        setIsProcessing(true);
        setResultText('');
        setError(null);

        try {
            // Parse base64 and mime type
            // base64 string format: "data:image/jpeg;base64,....." (likely jpeg due to compression)
            const matches = imagePreview.match(/^data:(.+);base64,(.+)$/);

            if (!matches || matches.length !== 3) {
                throw new Error("Invalid image data");
            }

            const mimeType = matches[1];
            const base64Data = matches[2];

            const sysInstruction = `You are a high-precision OCR and data extraction expert. Your task is to extract all text from the provided image.
Tables: Recreate them exactly as Markdown tables with headers.
Lists: Maintain all bullet points and numbered lists.
Formatting: Preserve the hierarchy of headings and paragraphs.
Accuracy: Do not summarize or paraphrase. Return the raw content exactly as it appears.
Output: Return ONLY the formatted Markdown. No conversational filler.`;

            const response = await fetch('/api/gemini/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: 'Extract text from this image.',
                    image: base64Data,
                    mimeType: mimeType,
                    systemInstruction: sysInstruction,
                    model: 'gemini-flash-latest',
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Include DETAILS in the error message for debugging
                const detailMsg = data.details || data.error || 'Failed to extract text';
                throw new Error(detailMsg);
            }

            setResultText(data.text);
        } catch (err: unknown) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : 'Error processing image';
            setError(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    const copyToClipboard = () => {
        if (!resultText) return;
        navigator.clipboard.writeText(resultText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const remarkPlugins = React.useMemo(() => [remarkGfm], []);

    return (
        <Transition.Root as={Fragment} show={isOpen}>
            <Dialog as="div" className="fixed inset-0 z-50 overflow-y-auto" onClose={onClose}>
                <div className="flex min-h-screen items-center justify-center p-4 text-center">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0">
                        <Dialog.Overlay className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" />
                    </Transition.Child>

                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        enterTo="opacity-100 translate-y-0 sm:scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                        leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">

                        <div className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all h-[80vh] flex flex-col">

                            {/* Header */}
                            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-medium leading-6 text-gray-900 flex items-center gap-2">
                                        <PhotoIcon className="h-5 w-5 text-indigo-500" />
                                        Extract Text from Image
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Paste an image (Ctrl+V) to extract tables and text (auto-compressed).
                                    </p>
                                </div>
                                <button
                                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                                    onClick={onClose}
                                    type="button">
                                    <XMarkIcon aria-hidden="true" className="h-6 w-6" />
                                </button>
                            </div>

                            {/* Content Grid */}
                            <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-200">

                                {/* Input Panel */}
                                <div className="flex-1 flex flex-col p-6 bg-gray-50/50">
                                    <div
                                        className={classNames(
                                            "flex-1 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-4 relative overflow-hidden group",
                                            imagePreview
                                                ? "border-indigo-200 bg-white"
                                                : "border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30"
                                        )}
                                        // Click to focus for paste (optional, global paste handles it)
                                        onPaste={handlePaste}
                                    >
                                        {imagePreview ? (
                                            <div className="relative w-full h-full flex items-center justify-center">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    alt="Preview"
                                                    className="max-h-full max-w-full object-contain shadow-sm rounded-lg"
                                                    src={imagePreview}
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-medium">
                                                    Paste new image to replace
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center pointer-events-none">
                                                <div className="mx-auto h-12 w-12 text-gray-400">
                                                    <PhotoIcon />
                                                </div>
                                                <p className="mt-2 text-sm text-gray-600 font-medium">Paste image here</p>
                                                <p className="text-xs text-gray-400 mt-1">Ctrl + V / Cmd + V</p>
                                            </div>
                                        )}
                                    </div>

                                    {error && (
                                        <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100 overflow-y-auto max-h-32">
                                            <span className="font-bold">Error:</span> {error}
                                        </div>
                                    )}

                                    <button
                                        className={classNames(
                                            "mt-4 w-full flex justify-center items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-all",
                                            !imagePreview || isProcessing
                                                ? "bg-gray-300 cursor-not-allowed"
                                                : "bg-indigo-600 hover:bg-indigo-500 focus-visible:outline-indigo-600"
                                        )}
                                        disabled={!imagePreview || isProcessing}
                                        onClick={handleExtract}>
                                        {isProcessing ? (
                                            <>
                                                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <ArrowPathIcon className="h-4 w-4" />
                                                Extract Text
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Output Panel */}
                                <div className="flex-1 flex flex-col bg-white min-h-[300px] md:min-h-0">
                                    <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
                                        <h4 className="text-sm font-medium text-gray-900">Results (Markdown)</h4>
                                        <button
                                            className={classNames(
                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                                                copied
                                                    ? "bg-green-100 text-green-700"
                                                    : resultText
                                                        ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                        : "bg-gray-50 text-gray-300 cursor-not-allowed"
                                            )}
                                            disabled={!resultText}
                                            onClick={copyToClipboard}>
                                            {copied ? (
                                                <>
                                                    <ClipboardDocumentCheckIcon className="h-3.5 w-3.5" />
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                                                    Copy
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-6">
                                        {resultText ? (
                                            <div className="prose prose-sm prose-indigo max-w-none">
                                                <ReactMarkdown remarkPlugins={remarkPlugins}>
                                                    {resultText}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">
                                                Extracted text will appear here...
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition.Root>
    );
});

export default ImageExtractionModal;
