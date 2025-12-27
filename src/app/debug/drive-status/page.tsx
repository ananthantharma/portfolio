'use client';

import React, { useEffect, useState } from 'react';

export default function DriveDebugPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/debug/drive-status')
            .then(res => res.json())
            .then(setData)
            .catch(err => setData({ error: err.message }))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="p-10 font-mono text-sm">
            <h1 className="text-2xl font-bold mb-4">Google Drive Debug Status</h1>
            {loading ? (
                <div>Loading...</div>
            ) : (
                <pre className="bg-gray-100 p-4 rounded overflow-auto border border-gray-300">
                    {JSON.stringify(data, null, 2)}
                </pre>
            )}
            <div className="mt-4">
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Refresh Status
                </button>
            </div>
        </div>
    );
}
