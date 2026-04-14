'use client';
/**
 * DrawingNode — embeds a resizable drawing canvas inside the Lexical editor.
 *
 * Tools  : pen, line, rectangle, circle, arrow, eraser
 * Persist: serialises as <img data-lexical-drawing="true"> so it survives
 *          the HTML round-trip (save → load).
 */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  $applyNodeReplacement,
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
} from 'lexical';

// ─── Constants ─────────────────────────────────────────────────────────────────

const INITIAL_WIDTH = 640;
const INITIAL_HEIGHT = 320;

const PALETTE = [
  '#000000', '#374151', '#EF4444', '#F97316',
  '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6',
  '#EC4899', '#FFFFFF',
];

// ─── Types ─────────────────────────────────────────────────────────────────────

type DrawTool = 'pen' | 'line' | 'rect' | 'circle' | 'arrow' | 'eraser';

export type SerializedDrawingNode = Spread<
  {dataUrl: string; width: number; height: number},
  SerializedLexicalNode
>;

// ─── Drawing Canvas Component ─────────────────────────────────────────────────

function DrawingCanvas({
  initialDataUrl,
  canvasWidth,
  canvasHeight,
  onSave,
  onResize,
}: {
  initialDataUrl: string;
  canvasWidth: number;
  canvasHeight: number;
  onSave: (dataUrl: string) => void;
  onResize: (w: number, h: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<DrawTool>('pen');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [hovered, setHovered] = useState(false);

  // Drawing state
  const drawing = useRef(false);
  const startPt = useRef<{x: number; y: number} | null>(null);
  const snapshot = useRef<ImageData | null>(null);

  // History for undo / redo
  const history = useRef<string[]>([]);
  const histIdx = useRef(-1);

  // Latest saved url — used to restore canvas after a resize
  const latestUrl = useRef(initialDataUrl);

  // ── Initialise ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (initialDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        pushHistory(canvas.toDataURL());
      };
      img.src = initialDataUrl;
    } else {
      pushHistory(canvas.toDataURL());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Restore after resize ────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = latestUrl.current;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (url) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = url;
    }
  }, [canvasWidth, canvasHeight]);

  // ── History helpers ─────────────────────────────────────────────────────────
  function pushHistory(url: string) {
    history.current = history.current.slice(0, histIdx.current + 1);
    history.current.push(url);
    histIdx.current = history.current.length - 1;
    latestUrl.current = url;
  }

  function restoreFromUrl(url: string) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      latestUrl.current = url;
      onSave(url);
    };
    img.src = url;
  }

  const undo = () => {
    if (histIdx.current <= 0) return;
    histIdx.current -= 1;
    restoreFromUrl(history.current[histIdx.current]);
  };

  const redo = () => {
    if (histIdx.current >= history.current.length - 1) return;
    histIdx.current += 1;
    restoreFromUrl(history.current[histIdx.current]);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL();
    pushHistory(url);
    onSave(url);
  };

  // ── Canvas helpers ──────────────────────────────────────────────────────────
  function getPos(e: React.MouseEvent): {x: number; y: number} {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  }

  function applyStyle(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.fillStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? strokeWidth * 6 : strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const head = Math.min(18, Math.hypot(x2 - x1, y2 - y1) * 0.35);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    if (head > 3) {
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    }
  }

  // ── Mouse events ────────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e);
    drawing.current = true;
    startPt.current = pos;
    applyStyle(ctx);

    if (tool === 'pen' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else {
      snapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e);
    const start = startPt.current!;
    applyStyle(ctx);

    if (tool === 'pen' || tool === 'eraser') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      return;
    }

    if (snapshot.current) ctx.putImageData(snapshot.current, 0, 0);
    ctx.beginPath();

    if (tool === 'line') {
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === 'rect') {
      ctx.strokeRect(start.x, start.y, pos.x - start.x, pos.y - start.y);
    } else if (tool === 'circle') {
      const rx = Math.abs(pos.x - start.x) / 2;
      const ry = Math.abs(pos.y - start.y) / 2;
      ctx.ellipse(
        start.x + (pos.x - start.x) / 2,
        start.y + (pos.y - start.y) / 2,
        Math.max(1, rx),
        Math.max(1, ry),
        0, 0, 2 * Math.PI,
      );
      ctx.stroke();
    } else if (tool === 'arrow') {
      drawArrow(ctx, start.x, start.y, pos.x, pos.y);
    }
  };

  const finalize = useCallback(() => {
    if (!drawing.current) return;
    drawing.current = false;
    startPt.current = null;
    snapshot.current = null;
    const canvas = canvasRef.current!;
    const url = canvas.toDataURL();
    pushHistory(url);
    onSave(url);
  }, [onSave]);

  useEffect(() => {
    document.addEventListener('mouseup', finalize);
    return () => document.removeEventListener('mouseup', finalize);
  }, [finalize]);

  // ── Canvas resize handle ────────────────────────────────────────────────────
  const onResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX, sy = e.clientY;
    const sw = canvasWidth, sh = canvasHeight;
    const onMove = (ev: MouseEvent) => {
      onResize(Math.max(200, sw + (ev.clientX - sx)), Math.max(100, sh + (ev.clientY - sy)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // ── Toolbar button helper ───────────────────────────────────────────────────
  const TB = ({t, icon, label}: {t: DrawTool; icon: string; label: string}) => (
    <button
      key={t}
      title={label}
      onClick={() => setTool(t)}
      className={`w-7 h-7 flex items-center justify-center rounded text-[14px] transition-all ${
        tool === t ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-500'
      }`}>
      {icon}
    </button>
  );

  return (
    <div
      contentEditable={false}
      className="relative inline-flex flex-col my-2 rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-white"
      style={{width: canvasWidth + 2, userSelect: 'none'}}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>

      {/* ── Toolbar ── */}
      <div
        className="flex items-center gap-1 px-2 py-1.5 border-b border-slate-100 bg-slate-50/80 flex-wrap"
        style={{transition: 'opacity 0.2s', opacity: hovered ? 1 : 0.5}}>

        {/* Tools */}
        <div className="flex items-center gap-0.5">
          <TB t="pen"    icon="✏️" label="Pen (freehand)" />
          <TB t="line"   icon="╱"  label="Line" />
          <TB t="rect"   icon="▭"  label="Rectangle" />
          <TB t="circle" icon="◯"  label="Circle / Ellipse" />
          <TB t="arrow"  icon="→"  label="Arrow" />
          <TB t="eraser" icon="⌫"  label="Eraser" />
        </div>

        <div className="w-px h-4 bg-slate-200 mx-0.5" />

        {/* Color palette */}
        <div className="flex items-center gap-0.5 flex-wrap" style={{maxWidth: 112}}>
          {PALETTE.map(c => (
            <button
              key={c}
              title={c}
              onClick={() => { setColor(c); if (tool === 'eraser') setTool('pen'); }}
              style={{
                backgroundColor: c,
                border: color === c ? '2px solid #6366f1' : '1px solid #d1d5db',
              }}
              className="w-4 h-4 rounded-sm flex-shrink-0 hover:scale-110 transition-transform"
            />
          ))}
        </div>

        <div className="w-px h-4 bg-slate-200 mx-0.5" />

        {/* Stroke width */}
        <input
          type="range" min={1} max={20} value={strokeWidth}
          onChange={e => setStrokeWidth(Number(e.target.value))}
          title={`Stroke: ${strokeWidth}px`}
          className="w-16 accent-indigo-500"
          style={{height: 4}}
        />
        <span className="text-[10px] text-slate-400 font-mono w-4 text-right">{strokeWidth}</span>

        <div className="w-px h-4 bg-slate-200 mx-0.5" />

        {/* Undo / Redo / Clear */}
        <button title="Undo" onClick={undo}
          className="w-6 h-6 flex items-center justify-center rounded text-[12px] hover:bg-slate-100 text-slate-500">
          ↩
        </button>
        <button title="Redo" onClick={redo}
          className="w-6 h-6 flex items-center justify-center rounded text-[12px] hover:bg-slate-100 text-slate-500">
          ↪
        </button>
        <button title="Clear canvas" onClick={clearCanvas}
          className="w-6 h-6 flex items-center justify-center rounded text-[12px] hover:bg-rose-50 hover:text-rose-500 text-slate-400 transition-colors">
          🗑
        </button>
      </div>

      {/* ── Canvas ── */}
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        style={{
          display: 'block',
          width: canvasWidth,
          height: canvasHeight,
          cursor: tool === 'eraser' ? 'cell' : 'crosshair',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
      />

      {/* ── Resize handle ── */}
      <div
        title="Drag to resize"
        onMouseDown={onResizeStart}
        style={{
          position: 'absolute', right: 0, bottom: 0,
          width: 16, height: 16, cursor: 'se-resize',
          background: 'linear-gradient(135deg, transparent 50%, #94a3b8 50%)',
          opacity: hovered ? 1 : 0, transition: 'opacity 0.2s',
        }}
      />
    </div>
  );
}

// ─── DrawingNode (Lexical DecoratorNode) ──────────────────────────────────────

export class DrawingNode extends DecoratorNode<React.ReactElement> {
  __dataUrl: string;
  __width: number;
  __height: number;

  static getType(): string { return 'drawing'; }

  static clone(node: DrawingNode): DrawingNode {
    return new DrawingNode(node.__dataUrl, node.__width, node.__height, node.__key);
  }

  static importJSON(s: SerializedDrawingNode): DrawingNode {
    return $createDrawingNode({dataUrl: s.dataUrl, width: s.width, height: s.height});
  }

  /**
   * importDOM: intercept <img data-lexical-drawing="true"> at priority 1
   * so it takes precedence over ImageNode's priority-0 img handler.
   */
  static importDOM(): DOMConversionMap | null {
    return {
      // The attribute check MUST be in the outer function so that
      // getConversionFunction returns null for regular <img> elements and
      // falls through to ImageNode's priority-0 handler.  Previously the outer
      // function always returned a non-null descriptor, which caused DrawingNode
      // (priority 1) to win the bid for every <img> and then silently drop it
      // when the inner conversion returned null — wiping out all inline images.
      img: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute('data-lexical-drawing')) return null;
        return {
          conversion: (el: HTMLElement): DOMConversionOutput | null => {
            const img = el as HTMLImageElement;
            return {
              node: $createDrawingNode({
                dataUrl: img.src,
                width: img.width || INITIAL_WIDTH,
                height: img.height || INITIAL_HEIGHT,
              }),
            };
          },
          priority: 1,
        };
      },
    };
  }

  constructor(dataUrl: string, width: number, height: number, key?: NodeKey) {
    super(key);
    this.__dataUrl = dataUrl;
    this.__width = width;
    this.__height = height;
  }

  exportJSON(): SerializedDrawingNode {
    return {type: 'drawing', version: 1, dataUrl: this.__dataUrl, width: this.__width, height: this.__height};
  }

  exportDOM(): DOMExportOutput {
    const img = document.createElement('img');
    img.src = this.__dataUrl;
    img.setAttribute('data-lexical-drawing', 'true');
    img.width = this.__width;
    img.height = this.__height;
    img.style.maxWidth = '100%';
    return {element: img};
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const div = document.createElement('div');
    return div;
  }

  updateDOM(): false { return false; }
  isInline(): boolean { return false; }

  decorate(editor: LexicalEditor): React.ReactElement {
    const handleSave = (dataUrl: string) => {
      editor.update(() => {
        this.getWritable().__dataUrl = dataUrl;
      });
    };
    const handleResize = (w: number, h: number) => {
      editor.update(() => {
        const node = this.getWritable();
        node.__width = w;
        node.__height = h;
      });
    };
    return (
      <DrawingCanvas
        key={this.__key}
        initialDataUrl={this.__dataUrl}
        canvasWidth={this.__width}
        canvasHeight={this.__height}
        onSave={handleSave}
        onResize={handleResize}
      />
    );
  }
}

// ─── Public helpers ────────────────────────────────────────────────────────────

export function $createDrawingNode({
  dataUrl = '',
  width = INITIAL_WIDTH,
  height = INITIAL_HEIGHT,
}: {
  dataUrl?: string;
  width?: number;
  height?: number;
} = {}): DrawingNode {
  return $applyNodeReplacement(new DrawingNode(dataUrl, width, height));
}

export function $isDrawingNode(node: LexicalNode | null | undefined): node is DrawingNode {
  return node instanceof DrawingNode;
}
