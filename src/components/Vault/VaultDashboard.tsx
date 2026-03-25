/* eslint-disable react/jsx-sort-props */
import {
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Grid3x3,
  Key,
  KeyRound,
  LayoutList,
  LogOut,
  LucideIcon,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Star,
  User,
  Vault,
  Pencil,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import React, {memo, useCallback, useMemo, useState} from 'react';

import {VaultEntry, VaultItemType} from '../../data/dataDef';

/* ─── Types ─────────────────────────────────────────────────────────── */
interface VaultDashboardProps {
  onAdd: () => void;
  onDelete: (id: string) => void;
  onSignOut: () => void;
  onUpdate: (id: string) => void;
  passwords: VaultEntry[];
  userEmail?: string | null;
}

type NavSection = VaultItemType | 'all' | 'favorites';

/* ─── Config per type ────────────────────────────────────────────────── */
const TYPE_CONFIG: Record<
  VaultItemType,
  {label: string; color: string; bg: string; border: string; Icon: LucideIcon}
> = {
  password: {
    label: 'Password',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    Icon: KeyRound,
  },
  card: {
    label: 'Card',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    Icon: CreditCard,
  },
  note: {
    label: 'Secure Note',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    Icon: FileText,
  },
  identity: {
    label: 'Identity',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    Icon: User,
  },
  apikey: {
    label: 'API Key',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    Icon: Key,
  },
};

/* ─── Helpers ────────────────────────────────────────────────────────── */
const getFavicon = (url: string) => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return null;
  }
};

const maskCard = (n?: string) =>
  n ? '**** **** **** ' + n.replace(/\s/g, '').slice(-4) : '•••• •••• •••• ••••';


/* ─── SecurityBadge ──────────────────────────────────────────────────── */
const SecurityBadge = memo(({password}: {password?: string}) => {
  const ok = password && password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
        ok
          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
          : 'border-red-500/25 bg-red-500/10 text-red-400'
      }`}>
      {ok ? <ShieldCheck size={9} /> : <ShieldAlert size={9} />}
      {ok ? 'Strong' : 'Weak'}
    </span>
  );
});
SecurityBadge.displayName = 'SecurityBadge';

/* ─── VaultCard ──────────────────────────────────────────────────────── */
const VaultCard = memo(
  ({
    copiedId,
    data,
    onCopy,
    onDelete,
    onEdit,
    revealId,
    onReveal,
    viewMode,
  }: {
    copiedId: string | null;
    data: VaultEntry;
    onCopy: (key: string, value: string) => void;
    onDelete: (id: string) => void;
    onEdit: (id: string) => void;
    revealId: string | null;
    onReveal: (id: string) => void;
    viewMode: 'grid' | 'list';
  }) => {
    const cfg = TYPE_CONFIG[data.itemType ?? 'password'];
    const {Icon} = cfg;
    const isRevealed = revealId === data._id;

    const favicon = data.itemType === 'password' && data.site ? getFavicon(data.site) : null;

    /* subtitle line */
    const subtitle = useMemo(() => {
      switch (data.itemType) {
        case 'password':
          return data.username || data.site || 'No username';
        case 'card':
          return maskCard(data.cardNumber);
        case 'note':
          return data.content?.slice(0, 60) || 'Empty note';
        case 'identity':
          return data.fullName || data.email || 'No details';
        case 'apikey':
          return data.service || 'No service';
        default:
          return '';
      }
    }, [data]);

    /* quick-copy target */
    const primaryCopyValue = useMemo(() => {
      switch (data.itemType) {
        case 'password':
          return data.password || '';
        case 'card':
          return (data.cardNumber || '').replace(/\s/g, '');
        case 'note':
          return data.content || '';
        case 'identity':
          return data.fullName || data.email || '';
        case 'apikey':
          return data.apiKey || '';
        default:
          return '';
      }
    }, [data]);

    const copyKey = `copy-${data._id}`;
    const isCopied = copiedId === copyKey;

    const grid = viewMode === 'grid';

    return (
      <div
        className={`group relative overflow-hidden rounded-2xl border bg-[#0e0e16] transition-all duration-200
          ${grid ? 'flex flex-col gap-4 p-5 hover:-translate-y-0.5 hover:shadow-2xl' : 'flex items-center gap-4 px-5 py-3.5'}
          ${cfg.border} hover:border-opacity-60`}
        style={{borderColor: 'rgba(255,255,255,0.07)'}}>

        {/* Type stripe at top (grid only) */}
        {grid && (
          <div className={`absolute inset-x-0 top-0 h-0.5 ${cfg.bg} opacity-80`} />
        )}

        {/* Icon & info */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${cfg.bg} ${cfg.border}`}>
            {favicon ? (
              <img alt="favicon" className="h-6 w-6 object-contain" src={favicon} />
            ) : (
              <Icon className={cfg.color} size={18} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-white">{data.title}</p>
              {data.favorite && <Star className="text-amber-400 flex-shrink-0" fill="currentColor" size={11} />}
            </div>
            <p className="mt-0.5 truncate font-mono text-xs text-zinc-500">{subtitle}</p>
          </div>
          {!grid && data.itemType === 'password' && <SecurityBadge password={data.password} />}
        </div>

        {/* grid extras */}
        {grid && data.itemType === 'password' && (
          <div className="flex items-center justify-between">
            <SecurityBadge password={data.password} />
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.color} ${cfg.bg} ${cfg.border}`}>
              {cfg.label}
            </span>
          </div>
        )}
        {grid && data.itemType !== 'password' && (
          <div className="flex justify-end">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.color} ${cfg.bg} ${cfg.border}`}>
              {cfg.label}
            </span>
          </div>
        )}

        {/* Actions */}
        <div
          className={`flex items-center gap-1 transition-opacity ${
            grid
              ? 'border-t border-white/5 pt-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
              : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
          }`}>
          {/* Reveal toggle (password / card / apikey) */}
          {['password', 'card', 'apikey'].includes(data.itemType ?? '') && (
            <button
              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
              onClick={e => {
                e.stopPropagation();
                onReveal(data._id);
              }}
              title={isRevealed ? 'Hide' : 'Reveal'}>
              {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}

          {/* Quick copy */}
          <button
            className={`rounded-lg p-1.5 transition-colors ${
              isCopied
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
            }`}
            onClick={e => {
              e.stopPropagation();
              onCopy(copyKey, primaryCopyValue);
            }}
            title="Copy">
            {isCopied ? <ShieldCheck size={14} /> : <Copy size={14} />}
          </button>

          {/* External link */}
          {data.itemType === 'password' && data.site && (
            <a
              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-blue-500/10 hover:text-blue-400"
              href={data.site}
              onClick={e => e.stopPropagation()}
              rel="noreferrer"
              target="_blank"
              title="Open site">
              <ExternalLink size={14} />
            </a>
          )}

          {/* Edit */}
          <button
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
            onClick={e => {
              e.stopPropagation();
              onEdit(data._id);
            }}
            title="Edit">
            <Pencil size={14} />
          </button>

          {/* Delete */}
          <button
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
            onClick={e => {
              e.stopPropagation();
              onDelete(data._id);
            }}
            title="Delete">
            <Trash2 size={14} />
          </button>
        </div>

        {/* Revealed secret overlay (grid) */}
        {grid && isRevealed && primaryCopyValue && (
          <div className="rounded-lg border border-white/5 bg-black/40 px-3 py-2 font-mono text-xs text-zinc-300 break-all">
            {primaryCopyValue}
          </div>
        )}
      </div>
    );
  },
);
VaultCard.displayName = 'VaultCard';

/* ─── Sidebar Nav Item ───────────────────────────────────────────────── */
const NavItem = memo(
  ({
    active,
    count,
    icon,
    label,
    onClick,
  }: {
    active: boolean;
    count?: number;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
  }) => (
    <button
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
        active
          ? 'bg-white/8 text-white shadow-sm'
          : 'text-zinc-500 hover:bg-white/4 hover:text-zinc-300'
      }`}
      onClick={onClick}>
      <span className={active ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
            active ? 'bg-white/10 text-zinc-300' : 'bg-zinc-800 text-zinc-500'
          }`}>
          {count}
        </span>
      )}
      {active && <ChevronRight size={12} className="text-zinc-500" />}
    </button>
  ),
);
NavItem.displayName = 'NavItem';

/* ─── Main Dashboard ─────────────────────────────────────────────────── */
export const VaultDashboard: React.FC<VaultDashboardProps> = memo(
  ({onAdd, onDelete, onSignOut, onUpdate, passwords, userEmail}) => {
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [activeSection, setActiveSection] = useState<NavSection>('all');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [revealId, setRevealId] = useState<string | null>(null);

    const copyToClipboard = useCallback((key: string, value: string) => {
      if (!value) return;
      navigator.clipboard.writeText(value);
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 2000);
    }, []);

    const handleReveal = useCallback((id: string) => {
      setRevealId(prev => (prev === id ? null : id));
    }, []);

    /* counts per type */
    const counts = useMemo(() => {
      const c: Record<string, number> = {all: passwords.length, favorites: 0};
      for (const t of Object.keys(TYPE_CONFIG)) c[t] = 0;
      for (const p of passwords) {
        const t = p.itemType ?? 'password';
        c[t] = (c[t] ?? 0) + 1;
        if (p.favorite) c.favorites = (c.favorites ?? 0) + 1;
      }
      return c;
    }, [passwords]);

    /* filtered list */
    const filtered = useMemo(() => {
      return passwords.filter(p => {
        if (activeSection === 'favorites' && !p.favorite) return false;
        if (activeSection !== 'all' && activeSection !== 'favorites' && p.itemType !== activeSection) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.username?.toLowerCase().includes(q) ||
          p.site?.toLowerCase().includes(q) ||
          p.service?.toLowerCase().includes(q) ||
          p.fullName?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q) ||
          p.content?.toLowerCase().includes(q)
        );
      });
    }, [passwords, activeSection, search]);

    const navSections: {id: NavSection; label: string; icon: React.ReactNode; count: number}[] = [
      {id: 'all', label: 'All Items', icon: <Vault size={16} />, count: counts.all},
      {id: 'password', label: 'Passwords', icon: <KeyRound size={16} />, count: counts.password ?? 0},
      {id: 'card', label: 'Cards', icon: <CreditCard size={16} />, count: counts.card ?? 0},
      {id: 'note', label: 'Secure Notes', icon: <FileText size={16} />, count: counts.note ?? 0},
      {id: 'identity', label: 'Identities', icon: <User size={16} />, count: counts.identity ?? 0},
      {id: 'apikey', label: 'API Keys', icon: <Key size={16} />, count: counts.apikey ?? 0},
      {id: 'favorites', label: 'Favorites', icon: <Star size={16} />, count: counts.favorites ?? 0},
    ];

    const weakPasswords = useMemo(
      () =>
        passwords.filter(
          p =>
            p.itemType === 'password' &&
            p.password &&
            (p.password.length < 10 || !/[A-Z]/.test(p.password) || !/[0-9]/.test(p.password)),
        ).length,
      [passwords],
    );

    return (
      <div className="flex h-full bg-[#07070f] text-zinc-100 overflow-hidden font-sans">

        {/* ── Sidebar ── */}
        <aside className="flex w-60 flex-col border-r border-white/[0.06] bg-[#07070f]">
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-5 py-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 shadow-lg">
              <Shield size={15} className="text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">
              Vault<span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">X</span>
            </span>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Library</p>
            {navSections.map(s => (
              <NavItem
                key={s.id}
                active={activeSection === s.id}
                count={s.count}
                icon={s.icon}
                label={s.label}
                onClick={() => setActiveSection(s.id)}
              />
            ))}

            {/* Security summary */}
            {weakPasswords > 0 && (
              <div className="mx-1 mt-4 rounded-xl border border-red-500/20 bg-red-500/8 p-3">
                <div className="flex items-center gap-2 text-red-400">
                  <ShieldAlert size={14} />
                  <span className="text-xs font-semibold">Security Alert</span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {weakPasswords} weak password{weakPasswords > 1 ? 's' : ''} detected
                </p>
              </div>
            )}
          </nav>

          {/* User */}
          <div className="border-t border-white/[0.06] p-4">
            <div className="flex items-center gap-3 rounded-xl px-2 py-2">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 text-xs font-bold text-white">
                {userEmail?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-zinc-300">{userEmail}</p>
                <button
                  className="mt-0.5 flex items-center gap-1 text-[10px] text-zinc-600 transition-colors hover:text-red-400"
                  onClick={onSignOut}>
                  <LogOut size={10} />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="flex min-w-0 flex-1 flex-col bg-[#07070f]">

          {/* Top bar */}
          <header className="flex h-14 flex-shrink-0 items-center gap-4 border-b border-white/[0.06] px-6">
            {/* Search */}
            <div className="relative flex-1 max-w-lg">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
                size={14}
              />
              <input
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-2 pl-9 pr-4 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20"
                onChange={e => setSearch(e.target.value)}
                placeholder="Search vault…"
                type="text"
                value={search}
              />
            </div>

            {/* View toggle */}
            <div className="flex rounded-xl border border-white/[0.06] bg-white/[0.03] p-0.5">
              <button
                className={`rounded-lg p-1.5 transition-all ${
                  viewMode === 'grid' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400'
                }`}
                onClick={() => setViewMode('grid')}>
                <Grid3x3 size={15} />
              </button>
              <button
                className={`rounded-lg p-1.5 transition-all ${
                  viewMode === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400'
                }`}
                onClick={() => setViewMode('list')}>
                <LayoutList size={15} />
              </button>
            </div>

            {/* Add button */}
            <button
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 hover:shadow-cyan-500/40 active:scale-95"
              onClick={onAdd}>
              <Plus size={15} />
              <span>New Item</span>
            </button>
          </header>

          {/* Section header */}
          <div className="flex items-center justify-between px-6 pb-2 pt-5">
            <div>
              <h1 className="text-base font-bold text-white">
                {navSections.find(s => s.id === activeSection)?.label ?? 'All Items'}
              </h1>
              <p className="text-xs text-zinc-600">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Grid / List */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {filtered.length === 0 ? (
              <div className="flex h-[50vh] flex-col items-center justify-center gap-3 text-zinc-600">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/5 bg-white/3">
                  <Search size={24} className="opacity-40" />
                </div>
                <p className="text-sm font-medium text-zinc-500">No items found</p>
                <p className="text-xs">
                  {search ? (
                    <button className="text-cyan-500 hover:underline" onClick={() => setSearch('')}>
                      Clear search
                    </button>
                  ) : (
                    <button className="text-cyan-500 hover:underline" onClick={onAdd}>
                      Add your first item
                    </button>
                  )}
                </p>
              </div>
            ) : (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    : 'flex flex-col gap-1.5'
                }>
                {filtered.map(entry => (
                  <VaultCard
                    key={entry._id}
                    copiedId={copiedId}
                    data={entry}
                    onCopy={copyToClipboard}
                    onDelete={onDelete}
                    onEdit={onUpdate}
                    revealId={revealId}
                    onReveal={handleReveal}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  },
);

VaultDashboard.displayName = 'VaultDashboard';
