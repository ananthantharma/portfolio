import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import React, { useRef, useState } from 'react';

interface CSVUploaderProps {
    onUploadSuccess: () => void;
    lastUpdated: string | null;
}

const CSVUploader: React.FC<CSVUploaderProps> = ({ onUploadSuccess, lastUpdated }) => {
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setMessage(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/finance/transactions/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (res.ok) {
                setMessage(`Success! Imported ${data.count} transactions.`);
                onUploadSuccess();
                if (fileInputRef.current) fileInputRef.current.value = '';
            } else {
                setMessage(`Error: ${data.error}`);
            }
        } catch (err) {
            console.error(err);
            setMessage('Upload failed.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex items-center gap-4 bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700">
            <div className="flex-1">
                <h3 className="text-white font-medium text-sm">Import Transactions</h3>
                {lastUpdated && (
                    <p className="text-gray-400 text-xs mt-1">
                        Last Uploaded: {new Date(lastUpdated).toLocaleDateString()} {new Date(lastUpdated).toLocaleTimeString()}
                    </p>
                )}
            </div>

            {message && (
                <div className={`text-xs px-2 py-1 rounded ${message.startsWith('Success') ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                    {message}
                </div>
            )}

            <label className={`cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <ArrowUpTrayIcon className="-ml-1 mr-2 h-5 w-5" />
                {uploading ? 'Uploading...' : 'Upload CSV'}
                <input
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    disabled={uploading}
                />
            </label>
        </div>
    );
};

export default CSVUploader;
