/* eslint-disable simple-import-sort/imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/jsx-sort-props */
'use client';

import React, { useState, useRef } from 'react';
import { Camera, Upload, Check, Loader2, X } from 'lucide-react';
import Image from 'next/image';

interface ExtractedData {
    vendorName?: string;
    vendorAddress?: string;
    date?: string;
    dueDate?: string;
    amount?: number;
    currency?: string;
    description?: string;
    gstNumber?: string;
    category?: string;
}

interface InvoiceScannerProps {
    onSaved: () => void;
}

export default function InvoiceScanner({ onSaved }: InvoiceScannerProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [scanData, setScanData] = useState<ExtractedData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
            setScanData(null);
            setError(null);
        }
    };

    const compressImage = async (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = document.createElement('img');
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                img.src = e.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    // Resize to max 1024px dimension to save size
                    const MAX_DIM = 1024;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_DIM) {
                            height *= MAX_DIM / width;
                            width = MAX_DIM;
                        }
                    } else {
                        if (height > MAX_DIM) {
                            width *= MAX_DIM / height;
                            height = MAX_DIM;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Image compression failed'));
                    }, 'image/jpeg', 0.8); // 80% quality JPEG
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    };

    const handleScan = async () => {
        if (!file) return;

        setIsScanning(true);
        setError(null);

        try {
            const compressedBlob = await compressImage(file);
            const formData = new FormData();
            formData.append('file', compressedBlob, 'invoice.jpg');

            const res = await fetch('/api/invoices/scan', {
                method: 'POST',
                body: formData,
            });

            let data;
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await res.json();
            } else {
                const text = await res.text();
                console.error("Non-JSON Response received:", text);
                throw new Error(`Server Error: ${res.status} ${res.statusText} - ${text.substring(0, 50)}...`);
            }

            if (!res.ok) {
                throw new Error(data.error || 'Failed to scan invoice');
            }

            setScanData(data.data);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error occurred during scanning');
        } finally {
            setIsScanning(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!scanData) return;

        setIsSaving(true);
        try {
            // Include the image as base64 if needed, usually passed back or re-read
            // Ideally backend returns the image URL/ID if it saved it temporarily, 
            // but here we might just re-send extracted data + user edits.
            // For MVP, we'll just save the data. Image storage strategy:
            // We can convert the file to base64 here to send to save API (since it wasn't saved in scan API).

            const reader = new FileReader();
            reader.readAsDataURL(file!);
            reader.onload = async () => {
                const base64Image = reader.result as string;

                const payload = {
                    ...scanData,
                    imageUrl: base64Image,
                    status: 'Pending'
                };

                const res = await fetch('/api/invoices', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    throw new Error('Failed to save invoice');
                }

                // Reset
                setFile(null);
                setPreviewUrl(null);
                setScanData(null);
                onSaved();
            };
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        if (scanData) {
            setScanData({ ...scanData, [e.target.name]: e.target.value });
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            {!scanData ? (
                <div className="flex flex-col items-center justify-center space-y-4">
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />

                    {previewUrl ? (
                        <div className="relative w-full max-w-md aspect-[3/4] rounded-lg overflow-hidden border border-gray-600">
                            <Image src={previewUrl} alt="Preview" fill className="object-contain" />
                            <button
                                onClick={() => { setFile(null); setPreviewUrl(null); }}
                                className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    ) : (
                        <div
                            className="w-full max-w-md h-64 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-gray-700/50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="p-4 bg-gray-700 rounded-full mb-3">
                                <Camera size={32} className="text-gray-400" />
                            </div>
                            <p className="text-gray-400 font-medium">Click to upload or snap a photo</p>
                            <p className="text-gray-500 text-sm mt-1">Supports JPG, PNG, WEBP</p>
                        </div>
                    )}

                    {error && <div className="text-red-400 text-sm">{error}</div>}

                    {file && (
                        <button
                            onClick={handleScan}
                            disabled={isScanning}
                            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isScanning ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    <span>Analysing with Gemini...</span>
                                </>
                            ) : (
                                <>
                                    <Upload size={20} />
                                    <span>Scan Invoice</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            ) : (
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Vendor Name</label>
                            <input type="text" name="vendorName" value={scanData.vendorName || ''} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Total Amount</label>
                            <input type="number" step="0.01" name="amount" value={scanData.amount || ''} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Date</label>
                            <input type="date" name="date" value={scanData.date || ''} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
                            <input type="text" name="category" value={scanData.category || ''} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                            <textarea name="description" rows={2} value={scanData.description || ''} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">GST/HST Number</label>
                            <input type="text" name="gstNumber" value={scanData.gstNumber || ''} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-700">
                        <button
                            type="button"
                            onClick={() => setScanData(null)}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        >
                            Back
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                            <span>Save Verified Invoice</span>
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
