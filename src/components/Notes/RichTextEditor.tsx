'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Using dynamic import with ssr: false to prevent hydration mismatch 
// and to ensure Quill (which relies on document/window) is only loaded on client.
const InternalRichTextEditor = dynamic(
    () => import('./InternalRichTextEditor'),
    {
        loading: () => <div className="h-64 w-full animate-pulse bg-gray-100" />,
        ssr: false,
    }
);

export default InternalRichTextEditor;
