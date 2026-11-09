/* eslint-disable react-memo/require-memo, react-memo/require-usememo, react/jsx-sort-props */
'use client';

import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  Handle,
  NodeProps,
  NodeResizer,
  Position,
} from '@xyflow/react';
import {
  AlertTriangle,
  AlignLeft,
  Banknote,
  BarChart3,
  Bookmark,
  Calendar,
  CheckCircle2,
  Clock,
  Code2,
  FileText,
  Flag,
  Folder,
  Globe,
  Hammer,
  Heart,
  Layers,
  Lightbulb,
  Link2,
  List,
  Mail,
  Megaphone,
  Phone,
  Plus,
  Rocket,
  Settings,
  ShoppingBag,
  Star,
  Target,
  User,
  Users,
  Wifi,
  Zap,
} from 'lucide-react';
import React, {createContext, useContext, useEffect, useLayoutEffect, useRef} from 'react';

import type {MindInfo} from './layout';
import {CARD_STATUS, ED, FD, PALETTE, STICKY_COLORS} from './model';

export const ICONS: Record<string, typeof Star> = {
  folder: Folder,
  list: List,
  bag: ShoppingBag,
  hammer: Hammer,
  banknote: Banknote,
  wifi: Wifi,
  text: AlignLeft,
  star: Star,
  flag: Flag,
  user: User,
  users: Users,
  lightbulb: Lightbulb,
  target: Target,
  rocket: Rocket,
  calendar: Calendar,
  check: CheckCircle2,
  alert: AlertTriangle,
  heart: Heart,
  zap: Zap,
  bookmark: Bookmark,
  code: Code2,
  chart: BarChart3,
  mail: Mail,
  phone: Phone,
  globe: Globe,
  megaphone: Megaphone,
  settings: Settings,
  file: FileText,
  layers: Layers,
  clock: Clock,
};
export const ICON_KEYS = Object.keys(ICONS);

export interface StudioCtx {
  editingId: string | null;
  startEdit: (id: string) => void;
  commitText: (id: string, text: string) => void;
  cancelEdit: () => void;
  snapshot: () => void;
  touch: () => void;
  mind: MindInfo | null;
  layout: 'right' | 'both' | 'down';
  toggleCollapse: (id: string) => void;
  addMindChild: (id: string) => void;
  dropTarget: string | null;
  taskDone: Record<string, boolean>;
  editingEdgeId: string | null;
  commitEdgeLabel: (id: string, label: string) => void;
  readOnly: boolean;
}
export const Studio = createContext<StudioCtx | null>(null);
export const useStudio = () => useContext(Studio)!;

const SIZE_PX: Record<string, number> = {sm: 12, md: 14, lg: 18, xl: 26};
const SIDES: [string, Position][] = [
  ['t', Position.Top],
  ['r', Position.Right],
  ['b', Position.Bottom],
  ['l', Position.Left],
];

function Handles({hidden = false}: {hidden?: boolean}) {
  return (
    <>
      {SIDES.map(([id, pos]) => (
        <Handle className={hidden ? 'fs-handle fs-handle-hidden' : 'fs-handle'} id={id} isConnectable={!hidden} key={id} position={pos} type="source" />
      ))}
    </>
  );
}

/** Text that reads like the node and turns editable in place on double-click. */
function EditableText({id, value, className, style, placeholder, singleLine = false}: {id: string; value: string; className?: string; style?: React.CSSProperties; placeholder?: string; singleLine?: boolean}) {
  const {editingId, commitText, cancelEdit} = useStudio();
  const editing = editingId === id;
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  useLayoutEffect(() => {
    if (!editing || !ref.current) return;
    done.current = false;
    const el = ref.current;
    el.innerText = value;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  if (!editing) {
    return (
      <div className={className} style={style}>
        {value ? value : <span className="fs-placeholder">{placeholder}</span>}
      </div>
    );
  }
  const finish = (save: boolean) => {
    if (done.current) return;
    done.current = true;
    if (save) commitText(id, (ref.current?.innerText || '').replace(/\n+$/, ''));
    else cancelEdit();
  };
  return (
    <div
      className={`${className || ''} fs-editing nodrag nopan nowheel`}
      contentEditable
      onBlur={() => finish(true)}
      onKeyDown={e => {
        e.stopPropagation();
        if (e.key === 'Escape') {
          e.preventDefault();
          finish(true);
        } else if (e.key === 'Enter' && (singleLine ? !e.shiftKey : e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          finish(true);
        }
      }}
      onPaste={e => {
        e.preventDefault();
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
      }}
      ref={ref}
      style={style}
      suppressContentEditableWarning
    />
  );
}

function Extras({d}: {d: FD}) {
  const {taskDone} = useStudio();
  return (
    <>
      {d.badge && <span className="fs-badge">{d.badge}</span>}
      {(d.link || d.taskId) && (
        <span className="fs-corner">
          {d.taskId && <CheckCircle2 className={taskDone[d.taskId] ? 'fs-task-done' : 'fs-task-open'} />}
          {d.link && (
            <a className="nodrag" href={d.link} onClick={e => e.stopPropagation()} rel="noreferrer" target="_blank" title={d.link}>
              <Link2 />
            </a>
          )}
        </span>
      )}
    </>
  );
}

function Resizer({selected, d, keepAspect = false, minW = 50, minH = 30}: {selected: boolean; d: FD; keepAspect?: boolean; minW?: number; minH?: number}) {
  const {snapshot, touch, readOnly} = useStudio();
  return (
    <NodeResizer
      handleClassName="fs-resize-handle"
      isVisible={selected && !d.locked && !readOnly}
      keepAspectRatio={keepAspect}
      lineClassName="fs-resize-line"
      minHeight={minH}
      minWidth={minW}
      onResizeEnd={touch}
      onResizeStart={snapshot}
    />
  );
}

const SVG_PATHS: Record<string, string> = {
  diamond: 'M50 1 L99 50 L50 99 L1 50 Z',
  parallelogram: 'M15 1 L99 1 L85 99 L1 99 Z',
  hexagon: 'M13 1 L87 1 L99 50 L87 99 L13 99 L1 50 Z',
  triangle: 'M50 1 L99 99 L1 99 Z',
  document: 'M1 1 L99 1 L99 84 C76 70 26 100 1 86 Z',
  cylinder: 'M1 12 C1 -3 99 -3 99 12 L99 88 C99 103 1 103 1 88 Z',
};

export function ShapeNode({id, data, selected}: NodeProps) {
  const d = data as FD;
  const pal = PALETTE[d.fill || 'blue'] || PALETTE.blue;
  const shape = d.shape || 'rounded';
  const border = d.border || 'none';
  const svg = shape in SVG_PATHS || shape === 'ellipse';
  const strokeColor = border === 'none' ? 'transparent' : pal.stroke;
  const textStyle: React.CSSProperties = {
    fontSize: SIZE_PX[d.textSize || 'md'],
    fontWeight: d.bold ? 700 : 550,
    textAlign: d.align || 'center',
    color: pal.ink,
    padding: shape === 'diamond' ? '18% 22%' : shape === 'triangle' ? '38% 22% 8%' : shape === 'parallelogram' || shape === 'hexagon' ? '8px 18%' : shape === 'cylinder' ? '20% 12px 8px' : '8px 14px',
  };
  const Icon = d.icon ? ICONS[d.icon] : null;
  return (
    <div className={`fs-node fs-shape ${selected ? 'is-selected' : ''}`}>
      <Resizer d={d} selected={!!selected} />
      {svg ? (
        <svg className="fs-shape-svg" preserveAspectRatio="none" viewBox="0 0 100 100">
          {shape === 'ellipse' ? (
            <ellipse cx="50" cy="50" fill={pal.fill} rx="49" ry="49" stroke={strokeColor} strokeDasharray={border === 'dashed' ? '6 4' : undefined} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          ) : (
            <path d={SVG_PATHS[shape]} fill={pal.fill} stroke={strokeColor} strokeDasharray={border === 'dashed' ? '6 4' : undefined} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          )}
          {shape === 'cylinder' && <path d="M1 12 C1 27 99 27 99 12" fill="none" stroke={border === 'none' ? pal.stroke : strokeColor} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
        </svg>
      ) : (
        <div
          className="fs-shape-box"
          style={{
            background: pal.fill,
            border: border === 'none' ? '1.5px solid transparent' : `1.5px ${border} ${pal.stroke}`,
            borderRadius: shape === 'pill' ? 999 : shape === 'rect' ? 6 : 14,
          }}
        />
      )}
      <Handles />
      <div className="fs-shape-text" style={{justifyContent: d.align === 'left' ? 'flex-start' : d.align === 'right' ? 'flex-end' : 'center'}}>
        {Icon && <Icon className="fs-shape-icon" style={{color: pal.ink}} />}
        <EditableText className="fs-text" id={id} placeholder="Type something" style={textStyle} value={d.label || ''} />
      </div>
      <Extras d={d} />
    </div>
  );
}

export function StickyNode({id, data, selected}: NodeProps) {
  const d = data as FD;
  return (
    <div className={`fs-node fs-sticky-wrap ${selected ? 'is-selected' : ''}`}>
      <Resizer d={d} minH={80} minW={80} selected={!!selected} />
      <div className="fs-sticky" style={{background: STICKY_COLORS[d.fill || 'yellow'] || STICKY_COLORS.yellow, transform: d.rotate ? `rotate(${d.rotate}deg)` : undefined}}>
        <EditableText className="fs-sticky-text" id={id} placeholder="Write a note" style={{fontSize: SIZE_PX[d.textSize || 'lg'] - 1, fontWeight: d.bold ? 700 : 600, textAlign: d.align || 'left'}} value={d.label || ''} />
      </div>
      <Handles />
      <Extras d={d} />
    </div>
  );
}

export function TextNode({id, data, selected}: NodeProps) {
  const d = data as FD;
  return (
    <div className={`fs-node fs-textnode ${selected ? 'is-selected' : ''}`}>
      <Resizer d={d} minH={24} minW={40} selected={!!selected} />
      <EditableText className="fs-free-text" id={id} placeholder="Text" style={{fontSize: SIZE_PX[d.textSize || 'lg'], fontWeight: d.bold ? 750 : 500, textAlign: d.align || 'left'}} value={d.label || ''} />
      <Handles />
      <Extras d={d} />
    </div>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]!.toUpperCase())
    .join('');

export function CardNode({id, data, selected}: NodeProps) {
  const d = data as FD;
  const {taskDone} = useStudio();
  const pal = PALETTE[d.fill || 'purple'] || PALETTE.purple;
  const st = CARD_STATUS[d.status || 'todo'];
  const done = d.taskId ? taskDone[d.taskId] : d.status === 'done';
  const due = d.due ? new Date(`${d.due}T12:00:00`) : null;
  return (
    <div className={`fs-node fs-card ${selected ? 'is-selected' : ''}`} style={{borderLeftColor: pal.stroke}}>
      <Resizer d={d} minH={70} minW={150} selected={!!selected} />
      <div className="fs-card-head">
        <span className="fs-card-dot" style={{background: pal.stroke}} />
        <EditableText className={`fs-card-title ${done ? 'is-done' : ''}`} id={id} placeholder="Card title" value={d.label || ''} />
        {d.owner && (
          <span className="fs-avatar" style={{background: pal.stroke}} title={d.owner}>
            {initials(d.owner)}
          </span>
        )}
      </div>
      {d.notes && <p className="fs-card-notes">{d.notes}</p>}
      <div className="fs-card-foot">
        <span className="fs-status" style={{color: st.color, background: `${st.color}1a`}}>
          {st.label}
        </span>
        {due && !Number.isNaN(due.getTime()) && (
          <span className="fs-due">
            <Calendar /> {due.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
          </span>
        )}
      </div>
      <Handles />
      <Extras d={d} />
    </div>
  );
}

export function FrameNode({id, data, selected}: NodeProps) {
  const d = data as FD;
  const pal = PALETTE[d.fill || 'gray'] || PALETTE.gray;
  return (
    <div className={`fs-frame ${selected ? 'is-selected' : ''}`} style={{background: `${pal.fill}66`, borderColor: selected ? pal.stroke : `${pal.stroke}aa`}}>
      <Resizer d={d} minH={120} minW={160} selected={!!selected} />
      <div className="fs-frame-title" style={{background: pal.fill, color: pal.ink}}>
        <EditableText className="fs-frame-label" id={id} placeholder="Section" singleLine value={d.label || ''} />
      </div>
    </div>
  );
}

/** Smooth freehand path through the recorded points. */
export function smoothPath(pts: number[]) {
  if (pts.length < 4) return '';
  let p = `M${pts[0]} ${pts[1]}`;
  for (let i = 2; i < pts.length - 2; i += 2) {
    const mx = (pts[i] + pts[i + 2]) / 2;
    const my = (pts[i + 1] + pts[i + 3]) / 2;
    p += ` Q${pts[i]} ${pts[i + 1]} ${mx} ${my}`;
  }
  p += ` L${pts[pts.length - 2]} ${pts[pts.length - 1]}`;
  return p;
}

export function DrawNode({data, selected}: NodeProps) {
  const d = data as FD;
  return (
    <div className={`fs-node fs-draw ${selected ? 'is-selected' : ''}`}>
      <Resizer d={d} minH={10} minW={10} selected={!!selected} />
      <svg preserveAspectRatio="none" viewBox={`0 0 ${d.w0 || 100} ${d.h0 || 100}`}>
        <path d={smoothPath(d.points || [])} fill="none" stroke={d.stroke || '#232838'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={d.strokeWidth || 3} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

export function ImageNode({data, selected}: NodeProps) {
  const d = data as FD;
  return (
    <div className={`fs-node fs-image ${selected ? 'is-selected' : ''}`}>
      <Resizer d={d} keepAspect minH={30} minW={30} selected={!!selected} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {d.src && <img alt={d.label || ''} draggable={false} src={d.src} />}
      <Handles />
      <Extras d={d} />
    </div>
  );
}

export function MindNode({id, data, selected}: NodeProps) {
  const d = data as FD;
  const {mind, layout, toggleCollapse, addMindChild, dropTarget, editingId, readOnly} = useStudio();
  const depth = mind?.depth[id] ?? 0;
  const color = mind?.color[id] || '#2b2d33';
  const count = mind?.count[id] || 0;
  const side = mind?.side[id] || 'r';
  const Icon = d.icon ? ICONS[d.icon] : null;
  const outward = layout === 'down' ? 'b' : side === 'l' ? 'l' : 'r';
  const fill = d.fill ? PALETTE[d.fill] : undefined;
  return (
    <div
      className={`fs-mind fs-mind-d${Math.min(depth, 2)} ${fill ? 'has-fill' : ''} ${selected ? 'is-selected' : ''} ${dropTarget === id ? 'is-drop' : ''}`}
      style={{['--branch' as string]: color, ...(fill ? {background: fill.fill, color: fill.ink, borderColor: fill.stroke} : {})}}>
      {SIDES.map(([sid, pos]) => (
        <Handle className={`fs-handle-hidden fs-mind-h-${sid} ${count && sid === outward ? 'has-count' : ''}`} id={sid} isConnectable={false} key={sid} position={pos} type="source" />
      ))}
      {Icon && <Icon className="fs-mind-icon" />}
      <EditableText className="fs-mind-text" id={id} placeholder="Idea" singleLine value={d.label || ''} />
      {d.badge && <span className="fs-mind-badge">{d.badge}</span>}
      {count > 0 && (
        <button
          className={`fs-mind-count nodrag fs-out-${outward}`}
          onClick={e => {
            e.stopPropagation();
            toggleCollapse(id);
          }}
          title={d.collapsed ? `Show ${count} hidden` : 'Collapse this branch'}
          type="button">
          {d.collapsed ? `+${count}` : count}
        </button>
      )}
      {selected && editingId !== id && !readOnly && (
        <button
          className={`fs-mind-add nodrag fs-add-${outward} ${count ? 'with-count' : ''}`}
          onClick={e => {
            e.stopPropagation();
            addMindChild(id);
          }}
          title="Add a branch (Tab)"
          type="button">
          <Plus />
        </button>
      )}
    </div>
  );
}

export const nodeTypes = {shape: ShapeNode, sticky: StickyNode, text: TextNode, card: CardNode, frame: FrameNode, draw: DrawNode, image: ImageNode, mind: MindNode};

// ── Connectors ─────────────────────────────────────────────────────────────
function EdgeLabelEditor({id, value}: {id: string; value: string}) {
  const {commitEdgeLabel} = useStudio();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <input
      className="fs-edge-input"
      defaultValue={value}
      onBlur={e => commitEdgeLabel(id, e.target.value)}
      onKeyDown={e => {
        e.stopPropagation();
        if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
      }}
      placeholder="Label"
      ref={ref}
    />
  );
}

export function FlowEdge(props: EdgeProps) {
  const {id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected} = props;
  const d = (props.data || {}) as ED;
  const {editingEdgeId} = useStudio();
  const params = {sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition};
  const [path, lx, ly] = d.path === 'bezier' ? getBezierPath(params) : d.path === 'straight' ? getStraightPath(params) : getSmoothStepPath({...params, borderRadius: 16, offset: 26});
  const color = d.color || '#3a4250';
  const width = d.width || 2;
  const arrow = d.arrow || 'end';
  const marker = `fs-arrow-${id}`;
  const dash = d.dash === 'dashed' ? '8 6' : d.dash === 'dotted' ? '1.5 6' : undefined;
  return (
    <>
      <defs>
        <marker id={marker} markerHeight="14" markerUnits="userSpaceOnUse" markerWidth="14" orient="auto-start-reverse" refX="11" refY="7" viewBox="0 0 14 14">
          <path d="M2,2 L12,7 L2,12 Z" fill={color} stroke={color} strokeLinejoin="round" strokeWidth="1" />
        </marker>
      </defs>
      {selected && <path d={path} fill="none" stroke="#7b68ee" strokeOpacity={0.25} strokeWidth={width + 8} />}
      <BaseEdge
        id={id}
        interactionWidth={22}
        markerEnd={arrow === 'end' || arrow === 'both' ? `url(#${marker})` : undefined}
        markerStart={arrow === 'start' || arrow === 'both' ? `url(#${marker})` : undefined}
        path={path}
        style={{stroke: color, strokeWidth: width, strokeDasharray: dash, strokeLinecap: d.dash === 'dotted' ? 'round' : undefined}}
      />
      {(d.label || editingEdgeId === id) && (
        <EdgeLabelRenderer>
          <div className="fs-edge-label nodrag nopan" style={{transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)`, borderColor: `${color}55`}}>
            {editingEdgeId === id ? <EdgeLabelEditor id={id} value={d.label || ''} /> : d.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export function MindEdge(props: EdgeProps) {
  const {id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition} = props;
  const color = ((props.data as ED)?.color as string) || '#9aa3b2';
  const [path] = getBezierPath({sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, curvature: 0.45});
  return <BaseEdge id={id} interactionWidth={0} path={path} style={{stroke: color, strokeWidth: ((props.data as ED)?.width as number) || 2.4, strokeLinecap: 'round'}} />;
}

export const edgeTypes = {flow: FlowEdge, mind: MindEdge};
