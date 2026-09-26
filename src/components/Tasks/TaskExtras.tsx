/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

// Shared bits for every task card: neon glow toggles, the vendor pill, and the vendor picker.

import {Building2, Droplet, Flame, Leaf} from 'lucide-react';
import React, {useContext, useEffect, useState} from 'react';

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

/** Pill naming the task's vendor; opens the vendor page when the workspace supports it. */
export function VendorPill({task, className}: {task: Task; className?: string}) {
  const openVendor = useContext(OpenVendorContext);
  const vendor = vendorOf(task);
  if (!vendor) return null;
  const content = (
    <>
      <Building2 size={11} />
      <span>{vendor.name}</span>
    </>
  );
  if (!openVendor) {
    return (
      <span className={`${styles.vendorPill} ${className || ''}`} title={`Linked to ${vendor.name}`}>
        {content}
      </span>
    );
  }
  return (
    <button
      className={`${styles.vendorPill} ${className || ''}`}
      onClick={e => {
        e.stopPropagation();
        openVendor(vendor._id, vendor.categoryId);
      }}
      title={`Open the ${vendor.name} vendor page`}
      type="button">
      {content}
    </button>
  );
}

export interface VendorOption extends TaskVendor {
  notebook: string;
}

let vendorCache: Promise<VendorOption[]> | null = null;

/** All vendors (sections of vendor notebooks), loaded once per page visit. */
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

/** Dropdown for linking a task to a vendor. */
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
      <option value="">{vendors === null ? 'Loading vendors…' : vendors.length ? 'No vendor' : 'No vendors yet'}</option>
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
