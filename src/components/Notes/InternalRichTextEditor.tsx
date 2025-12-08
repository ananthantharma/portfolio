
import 'react-quill/dist/quill.snow.css';
import 'quill-better-table/dist/quill-better-table.css';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - quill-better-table does not have types
import QuillBetterTableModule from 'quill-better-table';
import React from 'react';
import ReactQuill, { Quill } from 'react-quill';

// Handle CJS/ESM interop
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const QuillBetterTable = (QuillBetterTableModule as any).default || QuillBetterTableModule;

if (QuillBetterTable) {
    Quill.register({
        'modules/better-table': QuillBetterTable
    }, true);
}

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
    'better-table': {
        operationMenu: {
            items: {
                unmergeCells: {
                    text: 'Unmerge Cells'
                }
            }
        }
    },
}
    }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const InternalRichTextEditor = React.memo(React.forwardRef<any, RichTextEditorProps>(({ onChange, onBlur, placeholder, value }, ref) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quillRef = React.useRef<any>(null);

    React.useImperativeHandle(ref, () => ({
        getEditor: () => {
            if (quillRef.current) {
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
            return null;
        }
    }), []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleRef = React.useCallback((el: any) => {
        // Capture the internal ref
        quillRef.current = el;
    }, []);

    return (
        <div className="h-full flex flex-col relative">
            <ReactQuill
                // eslint-disable-next-line react/jsx-sort-props
                className="flex-1 h-full"
                modules={modules}
                onBlur={onBlur} // Pass onBlur
                onChange={onChange}
                placeholder={placeholder}
                ref={handleRef}
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

InternalRichTextEditor.displayName = 'InternalRichTextEditor';

export default InternalRichTextEditor;
