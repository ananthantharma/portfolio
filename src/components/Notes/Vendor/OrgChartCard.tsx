/* eslint-disable react-memo/require-usememo, react-memo/require-memo, react/jsx-sort-props */
'use client';

import {
  ClipboardPaste,
  Link2,
  Mail,
  MoreHorizontal,
  Network,
  PenLine,
  Phone,
  Trash2,
  Upload,
  X,
  ZoomIn,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import type {ProcessFlowEmbed} from '../../ProcessFlow/ProcessFlowBuilder';
import {
  deleteVendorFile,
  FlowData,
  FlowNode,
  shrinkImage,
  uploadVendorFile,
  VendorContact,
  vendorFileUrl,
  VendorKeyContact,
  VendorPatch,
  VendorProfile,
} from './vendorApi';
import styles from './VendorPage.module.css';

const ProcessFlowBuilder = dynamic(() => import('../../ProcessFlow/ProcessFlowBuilder'), {ssr: false});

// Must match the padding ProcessFlowBuilder uses when it renders the PNG preview
const PNG_PAD = 40;

export function matchContact(node: FlowNode, keyContacts: VendorKeyContact[]): VendorKeyContact | undefined {
  const title = node.title.toLowerCase();
  return keyContacts.find(kc => {
    const name = kc.contactId.name.trim().toLowerCase();
    return name.length > 1 && title.includes(name);
  });
}

function starterChart(vendorName: string, keyContacts: VendorKeyContact[]): FlowData {
  const blank = {badge: '', border: '', font: ''};
  const nodes: FlowNode[] = [
    {id: 'n1', x: 80, y: 40, w: 230, h: 56, title: vendorName, sub: '', theme: 'start', shape: 'pill', ...blank},
    ...keyContacts.map((kc, i) => ({
      id: `n${i + 2}`,
      x: 80 + i * 240,
      y: 180,
      w: 210,
      h: 74,
      title: kc.contactId.name,
      sub: kc.role || kc.contactId.position || '',
      theme: 'blue',
      shape: 'rect',
      ...blank,
    })),
  ];
  return {
    nodes,
    edges: keyContacts.map((_, i) => ({id: `e${i + 1}`, from: 'n1', to: `n${i + 2}`, fromSide: null, toSide: null, label: ''})),
    dir: 'TB',
    wrap: 4,
    canvasBg: '#ffffff',
  };
}

interface Props {
  vendorName: string;
  profile: VendorProfile;
  onPatch: (patch: VendorPatch) => Promise<void>;
}

export default function OrgChartCard({vendorName, profile, onPatch}: Props) {
  const {orgChart, keyContacts} = profile;
  const hasImage = !!orgChart.imageFileId;
  const hasChart = !!(orgChart.flowData?.nodes?.length && orgChart.flowPngFileId);
  const view: 'chart' | 'image' = hasImage && hasChart ? orgChart.view : hasChart ? 'chart' : 'image';

  const cardRef = useRef<HTMLElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [dropping, setDropping] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [openNode, setOpenNode] = useState<string | null>(null);
  const [chartWidth, setChartWidth] = useState<number | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setLightbox(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const saveImage = async (blob: Blob, name: string) => {
    setBusy(true);
    setError('');
    setHint('');
    let uploadedId: string | null = null;
    try {
      const shrunk = await shrinkImage(blob);
      const filename = shrunk === blob ? name : name.replace(/\.\w+$/, '') + '.jpg';
      const uploaded = await uploadVendorFile(shrunk, filename);
      uploadedId = uploaded._id;
      await onPatch({orgChart: {imageFileId: uploaded._id, view: 'image'}});
    } catch (err) {
      if (uploadedId) deleteVendorFile(uploadedId);
      setError(err instanceof Error ? err.message : 'Upload failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
    const file = item?.getAsFile();
    if (!file) return;
    e.preventDefault();
    saveImage(file, file.name && file.name !== 'image.png' ? file.name : `${vendorName} org chart.png`);
  };

  const pasteFromClipboard = async () => {
    setMenuOpen(false);
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find(t => t.startsWith('image/'));
        if (type) {
          await saveImage(await item.getType(type), `${vendorName} org chart.png`);
          return;
        }
      }
      setHint('Your clipboard has no image. Copy one, then paste here.');
    } catch {
      // Clipboard read needs permission in some browsers; Ctrl+V on the focused card always works
      setHint('Press Ctrl+V (⌘V on Mac) to paste the image here.');
    }
    cardRef.current?.focus();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropping(false);
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'));
    if (file) saveImage(file, file.name);
    else setError('Drop an image file (PNG, JPG, GIF, or WebP).');
  };

  const saveChart = async (data: unknown, png: Blob | null) => {
    if (!png) throw new Error('Add at least one box before saving.');
    const uploaded = await uploadVendorFile(png, `${vendorName} org chart.png`);
    try {
      await onPatch({orgChart: {flowData: data as FlowData, flowPngFileId: uploaded._id, view: 'chart'}});
    } catch (err) {
      deleteVendorFile(uploaded._id);
      throw err;
    }
  };

  const remove = async (what: 'image' | 'chart') => {
    setMenuOpen(false);
    const label = what === 'image' ? 'org chart image' : 'built org chart';
    if (!confirm(`Remove the ${label}? This can't be undone.`)) return;
    setBusy(true);
    try {
      await onPatch({
        orgChart:
          what === 'image'
            ? {imageFileId: null, view: 'chart'}
            : {flowData: null, flowPngFileId: null, view: 'image'},
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove. Try again.');
    } finally {
      setBusy(false);
    }
  };

  // Clickable areas over the rendered chart for boxes that match a key contact
  const hotspots = useMemo(() => {
    const nodes = orgChart.flowData?.nodes || [];
    if (!nodes.length) return [];
    const minx = Math.min(...nodes.map(n => n.x));
    const miny = Math.min(...nodes.map(n => n.y));
    const maxx = Math.max(...nodes.map(n => n.x + n.w));
    const maxy = Math.max(...nodes.map(n => n.y + n.h));
    const W = maxx - minx + PNG_PAD * 2;
    const H = maxy - miny + PNG_PAD * 2;
    return nodes
      .map(node => ({node, match: matchContact(node, keyContacts)}))
      .filter((h): h is {node: FlowNode; match: VendorKeyContact} => !!h.match)
      .map(({node, match}) => ({
        id: node.id,
        contact: match.contactId,
        role: match.role || match.contactId.position || node.sub,
        left: ((node.x - minx + PNG_PAD) / W) * 100,
        top: ((node.y - miny + PNG_PAD) / H) * 100,
        width: (node.w / W) * 100,
        height: (node.h / H) * 100,
      }));
  }, [orgChart.flowData, keyContacts]);

  const builderEmbed: ProcessFlowEmbed | null = builderOpen
    ? {
        title: `${vendorName} · org chart`,
        tag: 'ORG CHART',
        initialData: orgChart.flowData || starterChart(vendorName, keyContacts),
        autoArrange: !orgChart.flowData,
        startWithOutline: !orgChart.flowData,
        onSave: saveChart,
        onClose: () => setBuilderOpen(false),
      }
    : null;

  const imageUrl = view === 'image' && orgChart.imageFileId ? vendorFileUrl(orgChart.imageFileId) : null;
  const chartUrl = view === 'chart' && orgChart.flowPngFileId ? vendorFileUrl(orgChart.flowPngFileId) : null;

  return (
    <section
      aria-label="Org chart"
      className={`${styles.card} ${styles.wide}`}
      data-drop={dropping}
      id="vendor-org"
      onDragLeave={() => setDropping(false)}
      onDragOver={e => {
        if (Array.from(e.dataTransfer.types).includes('Files')) {
          e.preventDefault();
          setDropping(true);
        }
      }}
      onDrop={handleDrop}
      onPaste={handlePaste}
      ref={cardRef}
      tabIndex={-1}>
      <div className={styles.cardHead}>
        <h2>
          <Network size={17} />
          Org chart
          {orgChart.updatedAt && (hasImage || hasChart) && (
            <small>Updated {new Date(orgChart.updatedAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</small>
          )}
        </h2>
        {hasImage && hasChart && (
          <div className={styles.seg} role="group" aria-label="Org chart view">
            <button aria-pressed={view === 'chart'} onClick={() => onPatch({orgChart: {view: 'chart'}})}>
              Chart
            </button>
            <button aria-pressed={view === 'image'} onClick={() => onPatch({orgChart: {view: 'image'}})}>
              Image
            </button>
          </div>
        )}
        {(hasImage || hasChart) && (
          <>
            <button className={styles.btn} onClick={() => setBuilderOpen(true)} disabled={busy}>
              <PenLine size={14} />
              {hasChart ? 'Edit chart' : 'Build chart'}
            </button>
            <div className={styles.menu}>
              <button
                aria-expanded={menuOpen}
                aria-label="More org chart options"
                className={styles.iconBtn}
                onClick={() => setMenuOpen(v => !v)}>
                <MoreHorizontal size={16} />
              </button>
              {menuOpen && (
                <div className={styles.menuList} onMouseLeave={() => setMenuOpen(false)}>
                  <button onClick={pasteFromClipboard}>
                    <ClipboardPaste size={14} /> {hasImage ? 'Replace with pasted image' : 'Paste an image'}
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      fileInput.current?.click();
                    }}>
                    <Upload size={14} /> {hasImage ? 'Replace with uploaded image' : 'Upload an image'}
                  </button>
                  {hasImage && (
                    <button onClick={() => remove('image')}>
                      <Trash2 size={14} /> Remove image
                    </button>
                  )}
                  {hasChart && (
                    <button onClick={() => remove('chart')}>
                      <Trash2 size={14} /> Remove built chart
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <input
        accept="image/png,image/jpeg,image/gif,image/webp"
        hidden
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) saveImage(file, file.name);
          e.target.value = '';
        }}
        ref={fileInput}
        type="file"
      />

      {!hasImage && !hasChart ? (
        <div className={styles.orgOptions}>
          <button className={styles.orgOption} onClick={pasteFromClipboard} disabled={busy}>
            <ClipboardPaste size={22} />
            <strong>Paste image</strong>
            <span>Or press Ctrl+V on this card</span>
          </button>
          <button className={styles.orgOption} onClick={() => fileInput.current?.click()} disabled={busy}>
            <Upload size={22} />
            <strong>Upload image</strong>
            <span>Or drag a file here</span>
          </button>
          <button
            className={`${styles.orgOption} ${styles.orgOptionMain}`}
            onClick={() => setBuilderOpen(true)}
            disabled={busy}>
            <Network size={22} />
            <strong>Build chart</strong>
            <span>
              {keyContacts.length
                ? `Starts with your ${keyContacts.length} key contact${keyContacts.length === 1 ? '' : 's'}`
                : 'Opens the flow builder'}
            </span>
          </button>
        </div>
      ) : (
        <div className={styles.orgFrame}>
          <div className={styles.orgStage}>
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={`${vendorName} org chart`} onClick={() => setLightbox(imageUrl)} src={imageUrl} />
            )}
            {chartUrl && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`${vendorName} org chart`}
                  onClick={() => setLightbox(chartUrl)}
                  // The builder renders previews at 2x for sharpness; show them at their real size
                  onLoad={e => setChartWidth(e.currentTarget.naturalWidth / 2)}
                  src={chartUrl}
                  style={chartWidth ? {width: chartWidth, maxHeight: 'none'} : undefined}
                />
                {hotspots.map(h => (
                  <React.Fragment key={h.id}>
                    <button
                      aria-expanded={openNode === h.id}
                      aria-label={`Show contact details for ${h.contact.name}`}
                      className={styles.hotspot}
                      onClick={() => setOpenNode(openNode === h.id ? null : h.id)}
                      style={{left: `${h.left}%`, top: `${h.top}%`, width: `${h.width}%`, height: `${h.height}%`}}>
                      <span className={styles.hotspotDot}>
                        <Link2 size={10} />
                      </span>
                    </button>
                    {openNode === h.id && (
                      <ContactPopover
                        contact={h.contact}
                        onClose={() => setOpenNode(null)}
                        role={h.role}
                        style={{
                          left: `clamp(0px, calc(${h.left + h.width / 2}% - 125px), calc(100% - 250px))`,
                          top: `calc(${h.top + h.height}% + 6px)`,
                        }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {(hasImage || hasChart) && !error && !hint && (
        <p className={styles.hint}>
          <ZoomIn size={13} />
          Click the chart to see it full size.
          {view === 'chart' && hotspots.length > 0 && ' Boxes with a link icon open the contact.'}
          {' '}Paste or drop an image to replace it.
        </p>
      )}
      {busy && <p className={styles.muted}>Saving…</p>}
      {hint && <p className={styles.hint}>{hint}</p>}
      {error && <p className={styles.error}>{error}</p>}

      {lightbox && (
        <div className={styles.lightbox} onClick={() => setLightbox(null)} role="dialog" aria-label="Org chart full size">
          <button onClick={() => setLightbox(null)}>
            <X size={14} /> Close
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={`${vendorName} org chart, full size`} src={lightbox} />
        </div>
      )}

      {/* React events bubble through portals, so stop the builder's paste/drag events reaching this card */}
      {builderEmbed &&
        createPortal(
          <div
            onDragLeave={stop}
            onDragOver={stop}
            onDrop={stop}
            onPaste={stop}
            style={{display: 'contents'}}>
            <ProcessFlowBuilder embed={builderEmbed} />
          </div>,
          document.body,
        )}
    </section>
  );
}

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

function ContactPopover({
  contact,
  role,
  style,
  onClose,
}: {
  contact: VendorContact;
  role: string;
  style: React.CSSProperties;
  onClose: () => void;
}) {
  return (
    <div className={styles.contactPop} style={style} role="dialog" aria-label={contact.name}>
      <button aria-label="Close" className={styles.iconBtn} onClick={onClose} style={{float: 'right', marginTop: -4}}>
        <X size={14} />
      </button>
      <strong>{contact.name}</strong>
      <div className={styles.muted}>{[role, contact.department].filter(Boolean).join(' · ')}</div>
      {contact.email && (
        <a href={`mailto:${contact.email}`}>
          <Mail size={13} /> {contact.email}
        </a>
      )}
      {contact.phone && (
        <a href={`tel:${contact.phone}`}>
          <Phone size={13} /> {contact.phone}
        </a>
      )}
    </div>
  );
}
