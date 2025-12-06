'use client';

import 'react-quill/dist/quill.snow.css';

import dynamic from 'next/dynamic';
import React from 'react';

const ReactQuill = dynamic(() => import('react-quill'), {
    loading: () => <div className="h-64 w-full animate-pulse bg-gray-100" />,
    ssr: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;

interface RichTextEditorProps {
    onChange: (value: string) => void;
    placeholder?: string;
    value: string;
}

const modules = {
    toolbar: [
        [{ header: [1, 2, 3, false] }],
        [{ font: [] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
        [{ align: [] }],
        ['link', 'image'],
        ['clean'],
    ],
};

const formats = [
    'header',
    'font',
    'bold',
    'italic',
    'underline',
    'strike',
    'blockquote',
    'color',
    'background',
    'list',
    'bullet',
    'indent',
    'align',
    'link',
    'image',
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RichTextEditor = React.forwardRef<any, RichTextEditorProps>(({ onChange, placeholder, value }, ref) => {
    return (
        <div className="h-full flex flex-col relative">
            <ReactQuill
                ref={ref}
                className="flex-1 h-full"
                formats={formats}
                modules={modules}
                onChange={onChange}
                placeholder={placeholder}
                theme="snow"
                value={value}
            />
            <style global jsx>{`
        .quill {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .ql-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .ql-editor {
          flex: 1;
          overflow-y: auto;
          color: #111827; /* text-gray-900 */
        }
      `}</style>
        </div>
    );
});

RichTextEditor.displayName = 'RichTextEditor';

export default React.memo(RichTextEditor);
