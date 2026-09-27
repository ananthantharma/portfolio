/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

// Shared bits for every task card: neon glow toggles, the vendor pill, and the vendor picker.

import {Building2, Droplet, Flame, FolderKanban, Leaf} from 'lucide-react';
import React, {useContext, useEffect, useState} from 'react';
import {createPortal} from 'react-dom';

import {api} from './api';
import styles from './TaskExtras.module.css';
import {glowOf, NEON_GLOW, Task, TaskVendor, vendorOf} from './types';
import {OpenVendorContext} from './WorkspaceNavigation';

type GlowKey = NonNullable<Task['neonColor']>;

const GLOW_ICONS: {key: GlowKey; Icon: typeof Flame}[] = [
  {key: 'red', Icon: Flame},
  {key: 'blue', Icon: Droplet},
  {key: 'green', Icon: Leaf},
];

/** Inline style that makes a card glow in its chosen neon colour. */
export function glowStyle(task: Pick<Task, 'hasNeonBorder' | 'neonColor'>): React.CSSProperties | undefined {
  const glow = glowOf(task);
  if (!glow) return undefined;
  const hex = NEON_GLOW[glow].hex;
  return {
    borderColor: hex,
    boxShadow: `0 0 0 1px ${hex}, 0 0 10px ${hex}99, 0 0 22px ${hex}55`,
  };
}

/** Three icons; clicking one makes the card glow in that colour, clicking it again turns the glow off. */
export function GlowToggles({task, size = 13}: {task: Task; size?: number}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const active = glowOf(task);

  const pick = async (key: GlowKey, e: React.MouseEvent) => {
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    setError(false);
    try {
      // Saved on the task itself, so the glow follows you to any computer
      await api.update(task._id, active === key ? {hasNeonBorder: false, neonColor: null} : {hasNeonBorder: true, neonColor: key});
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <span aria-label="Glow colour" className={styles.glowGroup} role="group">
      {GLOW_ICONS.map(({key, Icon}) => {
        const on = active === key;
        const {hex, label} = NEON_GLOW[key];
        return (
          <button
            aria-label={`${on ? 'Remove' : 'Add'} ${label.toLowerCase()} glow`}
            aria-pressed={on}
            className={styles.glowButton}
            data-on={on}
            disabled={saving}
            key={key}
            onClick={e => pick(key, e)}
            style={{'--neon': hex} as React.CSSProperties}
            title={on ? `Remove ${label.toLowerCase()} glow` : `${label} glow`}
            type="button">
            <Icon size={size} />
          </button>
        );
      })}
      {error && (
        <span className={styles.glowError} role="alert">
          Not saved
        </span>
      )}
    </span>
  );
}

/** Pill naming the task's vendor or project; opens its page when the workspace supports it. */
export function VendorPill({task, className}: {task: Task; className?: string}) {
  const openVendor = useContext(OpenVendorContext);
  const options = useVendorOptions();
  const vendor = vendorOf(task);
  if (!vendor) return null;
  const isProject = options?.find(o => o._id === vendor._id)?.kind === 'project';
  const Icon = isProject ? FolderKanban : Building2;
  const classes = `${styles.vendorPill} ${isProject ? styles.projectPill : ''} ${className || ''}`;
  const content = (
    <>
      <Icon size={11} />
      <span>{vendor.name}</span>
    </>
  );
  if (!openVendor) {
    return (
      <span className={classes} title={`Linked to ${vendor.name}`}>
        {content}
      </span>
    );
  }
  return (
    <button
      className={classes}
      onClick={e => {
        e.stopPropagation();
        openVendor(vendor._id, vendor.categoryId);
      }}
      title={`Open the ${vendor.name} ${isProject ? 'project' : 'vendor'} page`}
      type="button">
      {content}
    </button>
  );
}

export interface VendorOption extends TaskVendor {
  notebook: string;
  kind: 'vendor' | 'project';
}

let vendorCache: Promise<VendorOption[]> | null = null;

/** All vendors and projects (sections of vendor / project notebooks), loaded once per page visit. */
export function useVendorOptions() {
  const [vendors, setVendors] = useState<VendorOption[] | null>(null);
  useEffect(() => {
    let alive = true;
    vendorCache =
      vendorCache ||
      fetch('/api/vendors')
        .then(res => res.json())
        .then(json => (Array.isArray(json.data) ? (json.data as VendorOption[]) : []))
        .catch(() => {
          vendorCache = null;
          return [];
        });
    vendorCache.then(list => alive && setVendors(list));
    return () => {
      alive = false;
    };
  }, []);
  return vendors;
}

/** Forget cached vendors (after a vendor is added or renamed). */
export function refreshVendorOptions() {
  vendorCache = null;
}

/** Dropdown for linking a task to a vendor or project. */
export function VendorSelect({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: TaskVendor | null;
  onChange: (vendor: TaskVendor | null) => void;
}) {
  const vendors = useVendorOptions();
  const notebooks = new Map<string, VendorOption[]>();
  (vendors || []).forEach(v => notebooks.set(v.notebook, [...(notebooks.get(v.notebook) || []), v]));
  // Keep the current vendor selectable even if the list hasn't loaded or it was moved
  const known = !value || (vendors || []).some(v => v._id === value._id);
  return (
    <select
      id={id}
      onChange={e => {
        const picked = (vendors || []).find(v => v._id === e.target.value);
        onChange(picked ? {_id: picked._id, name: picked.name, categoryId: picked.categoryId} : null);
      }}
      value={value?._id || ''}>
      <option value="">
        {vendors === null ? 'Loading…' : vendors.length ? 'Not linked' : 'No vendors or projects yet'}
      </option>
      {!known && value && <option value={value._id}>{value.name}</option>}
      {[...notebooks.entries()].map(([notebook, list]) =>
        notebooks.size > 1 ? (
          <optgroup key={notebook} label={notebook}>
            {list.map(v => (
              <option key={v._id} value={v._id}>
                {v.name}
              </option>
            ))}
          </optgroup>
        ) : (
          list.map(v => (
            <option key={v._id} value={v._id}>
              {v.name}
            </option>
          ))
        ),
      )}
    </select>
  );
}

/** Dashed "Link" pill on unlinked tasks: pick a project or vendor without opening the task. */
export function LinkVendorButton({task}: {task: Task}) {
  const vendors = useVendorOptions();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [pos, setPos] = useState<{top: number; left: number} | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const q = query.trim().toLowerCase();
  const matches = (vendors || []).filter(v => !q || v.name.toLowerCase().includes(q));
  const groups: [string, VendorOption[]][] = [
    ['Projects', matches.filter(v => v.kind === 'project')],
    ['Vendors', matches.filter(v => v.kind !== 'project')],
  ];

  const pick = async (v: VendorOption) => {
    setSaving(true);
    try {
      await api.update(task._id, {vendorSectionId: v._id});
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        className={styles.linkPill}
        onClick={e => {
          e.stopPropagation();
          const r = buttonRef.current?.getBoundingClientRect();
          if (r) setPos({top: Math.min(r.bottom + 4, window.innerHeight - 330), left: Math.max(8, Math.min(r.left, window.innerWidth - 268))});
          setOpen(v => !v);
        }}
        ref={buttonRef}
        title="Link this task to a project or vendor"
        type="button">
        + Link
      </button>
      {open &&
        pos &&
        createPortal(
          <div className={styles.linkPanel} onClick={e => e.stopPropagation()} ref={panelRef} style={{top: pos.top, left: pos.left}}>
            <input
              aria-label="Find a project or vendor"
              autoFocus
              onChange={e => setQuery(e.target.value)}
              placeholder="Find a project or vendor"
              value={query}
            />
            <div className={styles.linkList}>
              {vendors === null && <p className={styles.linkEmpty}>Loading…</p>}
              {vendors !== null && !matches.length && (
                <p className={styles.linkEmpty}>{vendors.length ? 'No match.' : 'Create a project or vendor notebook first.'}</p>
              )}
              {groups.map(([label, list]) =>
                list.length ? (
                  <React.Fragment key={label}>
                    <div className={styles.linkGroup}>{label}</div>
                    {list.map(v => {
                      const Icon = v.kind === 'project' ? FolderKanban : Building2;
                      return (
                        <button disabled={saving} key={v._id} onClick={() => pick(v)} type="button">
                          <Icon size={13} /> <span>{v.name}</span>
                          <small>{v.notebook}</small>
                        </button>
                      );
                    })}
                  </React.Fragment>
                ) : null,
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
