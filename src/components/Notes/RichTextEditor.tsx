'use client';

import 'react-quill/dist/quill.snow.css';

import dynamic from 'next/dynamic';
import React from 'react';

const ReactQuill = dynamic(
    async () => {
        const { default: RQ } = await import('react-quill');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, react/display-name
        return ({ forwardedRef, ...props }: any) => <RQ ref={forwardedRef} {...props} />;
    },
    {
        loading: () => <div className="h-64 w-full animate-pulse bg-gray-100" />,
        ssr: false,
    }
);

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
const RichTextEditor = React.memo(React.forwardRef<any, RichTextEditorProps>(({ onChange, placeholder, value }, ref) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quillRef = React.useRef<any>(null);

    React.useImperativeHandle(ref, () => ({
        getEditor: () => {
            if (quillRef.current) {
                console.log("Returning editor instance via useImperativeHandle");
                // Check if the ref.current is the ReactQuill component or the editor instance directly
                // ReactQuill 2.0 component often has getEditor() method
                if (typeof quillRef.current.getEditor === 'function') {
                    return quillRef.current.getEditor();
                } else if (typeof quillRef.current.editor !== 'undefined') {
                    // Sometimes it might expose editor property directly
                    return quillRef.current.editor;
                }
                // Fallback: return the ref itself if it looks like the editor
                return quillRef.current;
            }
            console.warn("quillRef.current is null in useImperativeHandle");
            return null;
        }
    }), []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleRef = React.useCallback((el: any) => {
        // Capture the internal ref
        quillRef.current = el;
        if (el) console.log("Internal ReactQuill ref captured:", el);
    }, []);

    return (
        <div className="h-full flex flex-col relative">
            <ReactQuill
                // eslint-disable-next-line react/jsx-sort-props
                className="flex-1 h-full"
                formats={formats}
                forwardedRef={handleRef}
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
}));

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
