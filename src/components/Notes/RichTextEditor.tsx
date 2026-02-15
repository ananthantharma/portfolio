import 'quill/dist/quill.snow.css';
import 'quill-better-table/dist/quill-better-table.css';

import dynamic from 'next/dynamic';
import React, { forwardRef, useImperativeHandle, useRef } from 'react';

/* eslint-disable react-memo/require-memo */
const ReactQuill = dynamic(
  async () => {
    const { default: RQ, Quill } = await import('react-quill-new');
    const { default: BlotFormatter } = await import('quill-blot-formatter');
    const { default: QuillBetterTable } = await import('quill-better-table');

    // Register modules with the Quill instance
    if (Quill) {
      if (!Quill.imports['modules/blotFormatter']) {
        Quill.register('modules/blotFormatter', BlotFormatter);
      }
      if (!Quill.imports['modules/better-table']) {
        Quill.register('modules/better-table', QuillBetterTable);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ({ forwardedRef, ...props }: any) => <RQ ref={forwardedRef} {...props} />;
  },
  {
    loading: () => <div className="h-64 w-full animate-pulse bg-gray-100" />,
    ssr: false,
  },
);
/* eslint-enable react-memo/require-memo */

export interface RichTextEditorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (value: string, delta: any, source: string, editor: any) => void;
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
          text: 'Another unmerge cells name',
        },
      },
    },
  },
  blotFormatter: {},
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RichTextEditor = React.memo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  forwardRef<any, RichTextEditorProps>(({ onChange, onBlur, placeholder, value }, ref) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quillRef = useRef<any>(null);

    useImperativeHandle(
      ref,
      () => ({
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
        },
      }),
      [],
    );

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
          /* Main Layout */
          .quill {
            display: flex;
            flex-direction: column;
            height: 100%;
            font-family: 'Inter', sans-serif;
          }

          /* Toolbar Styling */
          .ql-toolbar.ql-snow {
            border: none;
            border-bottom: 1px solid rgba(0, 0, 0, 0.04);
            padding: 12px 16px;
            background: white;
            flex-shrink: 0;
            z-index: 10;
          }

          .ql-toolbar.ql-snow .ql-formats {
            margin-right: 12px;
          }

          /* Toolbar Buttons */
          .ql-snow .ql-toolbar button,
          .ql-snow.ql-toolbar button {
            width: 28px;
            height: 28px;
            padding: 4px;
            margin-right: 2px;
            border-radius: 6px;
            transition: all 0.2s;
            color: #6b7280; /* text-gray-500 */
          }

          .ql-snow .ql-toolbar button:hover,
          .ql-snow.ql-toolbar button:hover,
          .ql-snow .ql-toolbar button.ql-active,
          .ql-snow.ql-toolbar button.ql-active,
          .ql-snow .ql-toolbar .ql-picker-label:hover,
          .ql-snow.ql-toolbar .ql-picker-label:hover,
          .ql-snow .ql-toolbar .ql-picker-item:hover,
          .ql-snow.ql-toolbar .ql-picker-item:hover {
            color: #111827; /* text-gray-900 */
            background-color: #f3f4f6; /* bg-gray-100 */
          }
          
           .ql-snow .ql-toolbar button.ql-active {
             background-color: #e0e7ff; /* indigo-50 */
             color: #4f46e5; /* indigo-600 */
           }
           
           .ql-snow .ql-toolbar button.ql-active .ql-stroke {
             stroke: #4f46e5;
           }

          /* Icons */
          .ql-snow .ql-stroke {
            stroke: #9ca3af; /* text-gray-400 */
            stroke-width: 1.5;
            transition: stroke 0.2s;
          }
          
          .ql-snow .ql-fill {
            fill: #9ca3af;
            transition: fill 0.2s;
          }

          .ql-snow .ql-toolbar button:hover .ql-stroke,
          .ql-snow .ql-toolbar button:focus .ql-stroke {
            stroke: #374151; /* text-gray-700 */
          }
          
           .ql-snow .ql-toolbar button:hover .ql-fill,
          .ql-snow .ql-toolbar button:focus .ql-fill {
            fill: #374151; /* text-gray-700 */
          }

          /* Container Styling */
          .ql-container.ql-snow {
            border: none;
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            font-size: 15px;
            color: #374151;
          }

          /* Editor Area */
          .ql-editor {
            flex: 1;
            overflow-y: auto;
            padding: 24px 32px;
            line-height: 1.7;
          }

          .ql-editor.ql-blank::before {
            color: #9ca3af;
            font-style: normal;
            font-size: 15px;
          }
          
          /* Custom Scrollbar */
          .ql-editor::-webkit-scrollbar {
            width: 8px;
          }
          .ql-editor::-webkit-scrollbar-track {
            background: transparent;
          }
          .ql-editor::-webkit-scrollbar-thumb {
            background-color: rgba(0, 0, 0, 0.1);
            border-radius: 4px;
          }
          .ql-editor::-webkit-scrollbar-thumb:hover {
            background-color: rgba(0, 0, 0, 0.2);
          }

          /* Typographic refinements for headings within editor */
          .ql-editor h1 { font-size: 1.75em; font-weight: 700; margin-bottom: 0.5em; margin-top: 0.5em; letter-spacing: -0.025em; color: #111827; }
          .ql-editor h2 { font-size: 1.4em; font-weight: 600; margin-bottom: 0.5em; margin-top: 1em; letter-spacing: -0.015em; color: #1f2937; }
          .ql-editor h3 { font-size: 1.2em; font-weight: 600; margin-bottom: 0.25em; margin-top: 1em; color: #374151; }
          .ql-editor p { margin-bottom: 0.75em; }
          .ql-editor ul, .ql-editor ol { padding-left: 1.5em; margin-bottom: 0.75em; }
          .ql-editor li { margin-bottom: 0.25em; }
          .ql-editor blockquote { border-left: 3px solid #e5e7eb; padding-left: 1em; color: #6b7280; font-style: italic; }
        `}</style>
      </div>
    );
  }),
);

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
