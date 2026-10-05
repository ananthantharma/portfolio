/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

// Shared bits for every task card: neon glow toggles, the vendor pill, and the vendor picker.

import {Building2, Check, Copy, Droplet, Flame, FolderKanban, Leaf, Plus, Tag, X} from 'lucide-react';
import React, {useContext, useEffect, useState} from 'react';
import {createPortal} from 'react-dom';

import {api} from './api';
import styles from './TaskExtras.module.css';
import {glowOf, NEON_GLOW, Task, TaskAssignee, TaskVendor, vendorOf} from './types';
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

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Older browsers / insecure contexts
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}

/** Small copy icon that puts the task's email subject on the clipboard (renders nothing without one). */
export function CopySubjectButton({subject, size = 13, className}: {subject?: string; size?: number; className?: string}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);
  const text = subject?.trim();
  if (!text) return null;
  return (
    <button
      aria-label={copied ? 'Email subject copied' : `Copy email subject: ${text}`}
      className={`${styles.copySubject} ${className || ''}`}
      data-copied={copied}
      onClick={async e => {
        e.stopPropagation();
        await copyToClipboard(text);
        setCopied(true);
      }}
      title={copied ? 'Copied' : `Copy email subject for Outlook search:\n${text}`}
      type="button">
      {copied ? <Check size={size} /> : <Copy size={size} />}
    </button>
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

export interface TaskGroupOption {
  _id: string;
  name: string;
}

// Your own task groups, shared by every task list on the page
let groupState: TaskGroupOption[] | null = null;
let groupLoad: Promise<void> | null = null;
const groupListeners = new Set<(groups: TaskGroupOption[] | null) => void>();
const setGroupState = (next: TaskGroupOption[]) => {
  groupState = [...next].sort((a, b) => a.name.localeCompare(b.name));
  groupListeners.forEach(fn => fn(groupState));
};

async function groupRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {...init, headers: {'Content-Type': 'application/json'}});
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error || `Request failed (${res.status})`);
  return json.data as T;
}

/** The groups you created for tasks that aren't linked to a project or vendor (null while loading). */
export function useTaskGroups() {
  const [groups, setGroups] = useState<TaskGroupOption[] | null>(groupState);
  useEffect(() => {
    groupListeners.add(setGroups);
    if (!groupLoad) {
      groupLoad = groupRequest<TaskGroupOption[]>('/api/task-groups')
        .then(list => setGroupState(list.map(({_id, name}) => ({_id, name}))))
        .catch(() => {
          groupLoad = null;
          setGroupState([]);
        });
    } else setGroups(groupState);
    return () => {
      groupListeners.delete(setGroups);
    };
  }, []);
  return groups;
}

export const taskGroupsApi = {
  create: async (name: string) => {
    const group = await groupRequest<TaskGroupOption>('/api/task-groups', {method: 'POST', body: JSON.stringify({name})});
    const clean = {_id: group._id, name: group.name};
    setGroupState([...(groupState || []).filter(g => g._id !== clean._id), clean]);
    return clean;
  },
  rename: async (id: string, name: string) => {
    const group = await groupRequest<TaskGroupOption>(`/api/task-groups/${id}`, {method: 'PATCH', body: JSON.stringify({name})});
    setGroupState((groupState || []).map(g => (g._id === id ? {_id: id, name: group.name} : g)));
  },
  /** Tasks in the group stay; they just become ungrouped. */
  remove: async (id: string) => {
    await groupRequest<unknown>(`/api/task-groups/${id}`, {method: 'DELETE'});
    setGroupState((groupState || []).filter(g => g._id !== id));
  },
};

export interface StaffMember {
  _id: string;
  name: string;
  email?: string;
  role?: string;
}

// Your staff list (people you assign work to), shared by everything on the page
let staffState: StaffMember[] | null = null;
let staffLoad: Promise<void> | null = null;
const staffListeners = new Set<(staff: StaffMember[] | null) => void>();
const setStaffState = (next: StaffMember[]) => {
  staffState = [...next].sort((a, b) => a.name.localeCompare(b.name));
  staffListeners.forEach(fn => fn(staffState));
};

/** Everyone in your staff list (null while loading). */
export function useStaffList() {
  const [staff, setStaff] = useState<StaffMember[] | null>(staffState);
  useEffect(() => {
    staffListeners.add(setStaff);
    if (!staffLoad) {
      staffLoad = groupRequest<StaffMember[]>('/api/staff')
        .then(list => setStaffState(list.map(({_id, name, email, role}) => ({_id, name, email, role}))))
        .catch(() => {
          staffLoad = null;
          setStaffState([]);
        });
    } else setStaff(staffState);
    return () => {
      staffListeners.delete(setStaff);
    };
  }, []);
  return staff;
}

export const staffApi = {
  add: async (person: {name: string; email?: string; role?: string}) => {
    const added = await groupRequest<StaffMember>('/api/staff', {method: 'POST', body: JSON.stringify(person)});
    setStaffState([...(staffState || []), added]);
    return added;
  },
  remove: async (id: string) => {
    await groupRequest<unknown>(`/api/staff/${id}`, {method: 'DELETE'});
    setStaffState((staffState || []).filter(p => p._id !== id));
  },
};

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]!.toUpperCase())
    .join('');

/** Avatar + first name of the person a task was handed to, so you remember to follow up. */
export function AssigneePill({assignee, className}: {assignee?: TaskAssignee | null; className?: string}) {
  if (!assignee?.name) return null;
  const first = assignee.name.trim().split(/\s+/)[0];
  return (
    <span
      className={`${styles.assignee} ${className || ''}`}
      title={`Assigned to ${assignee.name}${assignee.email ? ` <${assignee.email}>` : ''}. Follow up with them.`}>
      <span aria-hidden className={styles.assigneeAvatar}>
        {initialsOf(assignee.name)}
      </span>
      <span className={styles.assigneeName}>{first}</span>
    </span>
  );
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

/** Dashed "+ Group" pill on unlinked tasks: put it under a project, a vendor, or one of your own groups. */
export function LinkVendorButton({task}: {task: Task}) {
  const vendors = useVendorOptions();
  const taskGroups = useTaskGroups();
  const [error, setError] = useState<string | null>(null);
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

  const groupMatches = (taskGroups || []).filter(g => !q || g.name.toLowerCase().includes(q));
  const exactGroup = (taskGroups || []).some(g => g.name.toLowerCase() === q);
  const currentGroup = (taskGroups || []).find(g => g._id === task.taskGroupId);

  const save = async (patch: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    try {
      await api.update(task._id, patch);
      setOpen(false);
      setQuery('');
    } catch {
      setError('Not saved. Try again.');
    } finally {
      setSaving(false);
    }
  };
  const pick = (v: VendorOption) => save({vendorSectionId: v._id, taskGroupId: null});
  const pickGroup = (id: string | null) => save({taskGroupId: id});
  const createGroup = async () => {
    setSaving(true);
    setError(null);
    try {
      const group = await taskGroupsApi.create(query.trim());
      await api.update(task._id, {taskGroupId: group._id});
      setOpen(false);
      setQuery('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the group.');
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
        title="Put this task under a project, a vendor, or your own group"
        type="button">
        + Group
      </button>
      {open &&
        pos &&
        createPortal(
          <div className={styles.linkPanel} onClick={e => e.stopPropagation()} ref={panelRef} style={{top: pos.top, left: pos.left}}>
            <input
              aria-label="Find or create a group"
              autoFocus
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && q && !exactGroup && !saving) void createGroup();
              }}
              placeholder="Find a project, vendor or group"
              value={query}
            />
            {error && (
              <p className={styles.linkError} role="alert">
                {error}
              </p>
            )}
            <div className={styles.linkList}>
              {q && !exactGroup && (
                <button className={styles.linkCreate} disabled={saving} onClick={() => void createGroup()} type="button">
                  <Plus size={13} /> <span>Create group “{query.trim()}”</span>
                </button>
              )}
              {currentGroup && !q && (
                <button disabled={saving} onClick={() => void pickGroup(null)} type="button">
                  <X size={13} /> <span>Take out of {currentGroup.name}</span>
                </button>
              )}
              {groupMatches.length > 0 && (
                <>
                  <div className={styles.linkGroup}>My groups</div>
                  {groupMatches.map(g => (
                    <button
                      aria-pressed={g._id === task.taskGroupId}
                      className={styles.linkMine}
                      disabled={saving}
                      key={g._id}
                      onClick={() => void pickGroup(g._id)}
                      type="button">
                      <Tag size={13} /> <span>{g.name}</span>
                    </button>
                  ))}
                </>
              )}
              {vendors === null && <p className={styles.linkEmpty}>Loading…</p>}
              {vendors !== null && !matches.length && !groupMatches.length && !q && (
                <p className={styles.linkEmpty}>Type a name to create your first group.</p>
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
