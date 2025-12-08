import 'react-quill/dist/quill.snow.css';

import dynamic from 'next/dynamic';
import React, { forwardRef, useImperativeHandle, useRef } from 'react';

/* eslint-disable react-memo/require-memo */
const ReactQuill = dynamic(
    async () => {
        const { default: RQ } = await import('react-quill');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return ({ forwardedRef, ...props }: any) => <RQ ref={forwardedRef} {...props} />;
    },
    {
        loading: () => <div className="h-64 w-full animate-pulse bg-gray-100" />,
        ssr: false,
    }
);
/* eslint-enable react-memo/require-memo */

export interface RichTextEditorProps {
    onChange: (value: string) => void;
    onBlur?: () => void;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RichTextEditor = React.memo(forwardRef<any, RichTextEditorProps>(({ onChange, onBlur, placeholder, value }, ref) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quillRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
        getEditor: () => {
            if (quillRef.current) {
                // Check if the ref.current is the ReactQuill component or the editor instance directly
                if (typeof quillRef.current.getEditor === 'function') {
                    return quillRef.current.getEditor();
                } else if (typeof quillRef.current.editor !== 'undefined') {
                    // Sometimes it might expose editor property directly
                    return quillRef.current.editor;
                }
                // Fallback: return the ref itself if it looks like the editor
                return quillRef.current;
            }
            return null;
        }
    }), []);

    return (
        <div className="h-full flex flex-col relative">
            <ReactQuill
                // eslint-disable-next-line react/jsx-sort-props
                className="flex-1 h-full"
                forwardedRef={quillRef}
                modules={modules}
                onBlur={onBlur}
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
