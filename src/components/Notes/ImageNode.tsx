/**
 * ImageNode — a Lexical DecoratorNode for inline images.
 * Images are stored as base64 data URLs so no upload endpoint is required.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    DecoratorNode,
    DOMConversionMap,
    DOMConversionOutput,
    DOMExportOutput,
    EditorConfig,
    LexicalEditor,
    LexicalNode,
    NodeKey,
    SerializedLexicalNode,
    Spread,
    $applyNodeReplacement,
    $getNodeByKey,
} from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

// ─── Serialized shape ────────────────────────────────────────────────────────
export type SerializedImageNode = Spread<
    {
        src: string;
        altText: string;
        width?: number;
        height?: number;
    },
    SerializedLexicalNode
>;

// ─── Renderer component ───────────────────────────────────────────────────────
function ImageComponent({
    src,
    altText,
    width,
    height,
    nodeKey,
}: {
    src: string;
    altText: string;
    width?: number;
    height?: number;
    nodeKey: NodeKey;
}) {
    const [editor] = useLexicalComposerContext();
    const [isSelected, setIsSelected] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const startXRef = useRef(0);
    const startWRef = useRef(0);

    // Track selection
    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                const node = $getNodeByKey(nodeKey);
                const active = !!(node && document.activeElement?.contains(imgRef.current ?? null));
                setIsSelected(active);
            });
        });
    }, [editor, nodeKey]);

    const onResizeStart = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            setIsResizing(true);
            startXRef.current = e.clientX;
            startWRef.current = imgRef.current?.width ?? width ?? 200;

            const onMove = (ev: MouseEvent) => {
                const newW = Math.max(80, startWRef.current + (ev.clientX - startXRef.current));
                if (imgRef.current) {
                    imgRef.current.style.width = `${newW}px`;
                    imgRef.current.style.height = 'auto';
                }
            };
            const onUp = (ev: MouseEvent) => {
                const finalW = Math.max(80, startWRef.current + (ev.clientX - startXRef.current));
                editor.update(() => {
                    const node = $getNodeByKey(nodeKey);
                    if (node instanceof ImageNode) {
                        const writable = node.getWritable();
                        writable.__width = finalW;
                        writable.__height = undefined; // auto
                    }
                });
                setIsResizing(false);
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        },
        [editor, nodeKey, width],
    );

    return (
        <span
            style={{ display: 'inline-block', position: 'relative', userSelect: 'none' }}
            onClick={() => setIsSelected(true)}
            onBlur={() => setIsSelected(false)}
        >
            <img
                ref={imgRef}
                src={src}
                alt={altText}
                style={{
                    width: width ? `${width}px` : 'auto',
                    height: height ? `${height}px` : 'auto',
                    maxWidth: '100%',
                    display: 'block',
                    border: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
                    borderRadius: '2px',
                    cursor: 'pointer',
                }}
                draggable={false}
            />
            {/* Resize handle */}
            <span
                style={{
                    position: 'absolute',
                    right: 0,
                    bottom: 0,
                    width: 12,
                    height: 12,
                    background: '#3b82f6',
                    cursor: 'se-resize',
                    borderRadius: '2px',
                    opacity: isSelected || isResizing ? 1 : 0,
                    transition: 'opacity 0.15s',
                }}
                onMouseDown={onResizeStart}
            />
        </span>
    );
}

// ─── ImageNode class ──────────────────────────────────────────────────────────
export class ImageNode extends DecoratorNode<React.ReactElement> {
    __src: string;
    __altText: string;
    __width?: number;
    __height?: number;

    static getType(): string {
        return 'image';
    }

    static clone(node: ImageNode): ImageNode {
        return new ImageNode(node.__src, node.__altText, node.__width, node.__height, node.__key);
    }

    static importJSON(serializedNode: SerializedImageNode): ImageNode {
        const { src, altText, width, height } = serializedNode;
        return $createImageNode({ src, altText, width, height });
    }

    static importDOM(): DOMConversionMap | null {
        return {
            img: () => ({
                conversion: convertImgElement,
                priority: 0,
            }),
        };
    }

    constructor(src: string, altText: string, width?: number, height?: number, key?: NodeKey) {
        super(key);
        this.__src = src;
        this.__altText = altText;
        this.__width = width;
        this.__height = height;
    }

    exportJSON(): SerializedImageNode {
        return {
            type: 'image',
            version: 1,
            src: this.__src,
            altText: this.__altText,
            width: this.__width,
            height: this.__height,
        };
    }

    exportDOM(): DOMExportOutput {
        const img = document.createElement('img');
        img.src = this.__src;
        img.alt = this.__altText;
        if (this.__width) img.width = this.__width;
        if (this.__height) img.height = this.__height;
        img.style.maxWidth = '100%';
        return { element: img };
    }

    createDOM(_config: EditorConfig): HTMLElement {
        const span = document.createElement('span');
        span.style.display = 'inline-block';
        return span;
    }

    updateDOM(): false {
        return false;
    }

    decorate(_editor: LexicalEditor): React.ReactElement {
        return (
            <ImageComponent
                src={this.__src}
                altText={this.__altText}
                width={this.__width}
                height={this.__height}
                nodeKey={this.__key}
            />
        );
    }

    isInline(): boolean {
        return false;
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function convertImgElement(domNode: Node): DOMConversionOutput {
    const img = domNode as HTMLImageElement;
    const node = $createImageNode({
        src: img.src,
        altText: img.alt ?? '',
        width: img.width || undefined,
        height: img.height || undefined,
    });
    return { node };
}

export function $createImageNode({
    src,
    altText,
    width,
    height,
}: {
    src: string;
    altText?: string;
    width?: number;
    height?: number;
}): ImageNode {
    return $applyNodeReplacement(new ImageNode(src, altText ?? '', width, height));
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
    return node instanceof ImageNode;
}
