import {
  Archive,
  Copy,
  ExternalLink,
  Eye,
  Filter,
  Grid,
  LayoutList,
  Lock,
  PenLine,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Vault,
} from 'lucide-react';
import React, { memo, useCallback, useMemo, useState } from 'react';

import { PasswordEntry } from '../../data/dataDef';

interface VaultDashboardProps {
  onAdd: () => void;
  onDelete: (id: string) => void;
  onSignOut: () => void;
  onUpdate: (id: string, data: Partial<PasswordEntry>) => void;
  passwords: PasswordEntry[];
  userEmail?: string | null;
}

const getFavicon = (url: string) => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return 'https://ui-avatars.com/api/?name=Vault&background=random';
  }
};

const SecurityBadge = memo(({ password }: { password: string }) => {
  const isWeak = !password || password.length < 8;
  return (
    <div
      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${isWeak
        ? 'bg-red-500/10 border-red-500/20 text-red-500'
        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
        }`}>
      {isWeak ? <ShieldAlert size={10} /> : <ShieldCheck size={10} />}
      {isWeak ? 'Weak' : 'Secure'}
    </div>
  );
});

SecurityBadge.displayName = 'SecurityBadge';

const ActionButton = memo(({
  active,
  icon,
  onClick,
  tooltip,
}: {
  active?: boolean;
  icon: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  tooltip?: string;
}) => (
  <button
    className={`p-1.5 rounded-md transition-colors ${active ? 'bg-emerald-500/10 text-emerald-500' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'
      }`}
    onClick={onClick}
    title={tooltip}>
    {icon}
  </button>
));

ActionButton.displayName = 'ActionButton';

const SidebarItem = memo(({
  active,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) => (
  <button
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${active ? 'bg-orange-500/10 text-orange-500' : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#1E1E1E]'
      }`}
    onClick={onClick}>
    {icon}
    {label}
  </button>
));

SidebarItem.displayName = 'SidebarItem';

const VaultCard = memo(({
  copiedId,
  data,
  onCopyPass,
  onCopyUser,
  onDelete,
  onUpdate,
  viewMode,
}: {
  copiedId: string | null;
  data: PasswordEntry;
  onCopyPass: (id: string, password: string) => void;
  onCopyUser: (id: string, username: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string) => void;
  viewMode: 'grid' | 'list';
}) => {
  const isCopiedUser = copiedId === `user-${data._id}`;
  const isCopiedPass = copiedId === `pass-${data._id}`;

  const userIcon = useMemo(() => <Copy size={14} />, []);
  const passIcon = useMemo(() => (isCopiedPass ? <ShieldCheck size={14} /> : <Eye size={14} />), [isCopiedPass]);
  const editIcon = useMemo(() => <PenLine size={14} />, []);
  const linkIcon = useMemo(() => <ExternalLink size={14} />, []);
  const trashIcon = useMemo(() => <Trash2 size={14} />, []);

  const handleCopyUser = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCopyUser(data._id, data.username || '');
  }, [data._id, data.username, onCopyUser]);

  const handleCopyPass = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCopyPass(data._id, data.password || '');
  }, [data._id, data.password, onCopyPass]);

  const handleUpdateClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(data._id);
  }, [data._id, onUpdate]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(data._id);
  }, [data._id, onDelete]);

  return (
    <div
      className={`
      group relative bg-[#1E1E1E] hover:bg-[#252525] border border-transparent hover:border-zinc-700 
      transition-all duration-200 cursor-pointer overflow-hidden
      ${viewMode === 'grid'
          ? 'rounded-xl p-5 flex flex-col gap-4 hover:-translate-y-1 hover:shadow-xl'
          : 'rounded-lg p-3 flex items-center gap-4'
        }
    `}>
      {/* Icon & Title */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0 p-2">
          {data.site ? (
            <img alt="favicon" className="w-full h-full object-contain" src={getFavicon(data.site)} />
          ) : (
            <div className="text-zinc-600 font-bold text-lg">{data.title.charAt(0)}</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-zinc-100 font-semibold truncate text-sm">{data.title}</h3>
            {viewMode === 'grid' && <SecurityBadge password={data.password || ''} />}
          </div>
          <p className="text-zinc-500 text-xs truncate">{data.username || 'No username'}</p>
        </div>
      </div>

      {viewMode === 'list' && <SecurityBadge password={data.password || ''} />}

      {/* Actions (Always visible on mobile, hover on desktop) */}
      <div
        className={`
        flex items-center gap-1
        ${viewMode === 'grid'
            ? 'pt-3 border-t border-zinc-800/50 justify-between opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity'
            : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity'
          }
      `}>
        <div className="flex items-center gap-1">
          <ActionButton active={isCopiedUser} icon={userIcon} onClick={handleCopyUser} tooltip="Copy User" />
          <ActionButton
            active={isCopiedPass}
            icon={passIcon}
            onClick={handleCopyPass}
            tooltip="Copy Password"
          />
          <ActionButton active={false} icon={editIcon} onClick={handleUpdateClick} tooltip="Edit" />
          {data.site && (
            <a
              className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors"
              href={data.site}
              rel="noreferrer"
              target="_blank">
              {linkIcon}
            </a>
          )}
        </div>

        {viewMode === 'grid' && (
          <button
            className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
            onClick={handleDeleteClick}>
            {trashIcon}
          </button>
        )}
      </div>

      {viewMode === 'list' && (
        <button
          className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
          onClick={handleDeleteClick}>
          {trashIcon}
        </button>
      )}
    </div>
  );
});

VaultCard.displayName = 'VaultCard';

export const VaultDashboard: React.FC<VaultDashboardProps> = memo(({
  onAdd,
  onDelete,
  onSignOut,
  onUpdate,
  passwords,
  userEmail,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredPasswords = useMemo(() => {
    return passwords.filter(
      p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.username?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [passwords, searchQuery]);

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleCopyUser = useCallback((id: string, username: string) => {
    copyToClipboard(username, `user-${id}`);
  }, [copyToClipboard]);

  const handleCopyPass = useCallback((id: string, password: string) => {
    copyToClipboard(password, `pass-${id}`);
  }, [copyToClipboard]);

  const handleUpdateWrapper = useCallback((id: string) => {
    onUpdate(id, {});
  }, [onUpdate]);

  const vaultIcon = useMemo(() => <Vault size={18} />, []);
  const archiveIcon = useMemo(() => <Archive size={18} />, []);
  const shieldIcon = useMemo(() => <ShieldCheck size={18} />, []);
  const searchIcon = useMemo(() => <Search className="text-zinc-500 group-focus-within:text-orange-500 transition-colors" size={16} />, []);
  const filterIcon = useMemo(() => <Filter size={18} />, []);
  const gridIcon = useMemo(() => <Grid size={16} />, []);
  const listIcon = useMemo(() => <LayoutList size={16} />, []);
  const plusIcon = useMemo(() => <Plus size={16} />, []);
  const searchLargeIcon = useMemo(() => <Search className="opacity-20" size={32} />, []);
  const lockIcon = useMemo(() => <Lock size={16} strokeWidth={3} />, []);

  const handleTabAll = useCallback(() => setActiveTab('all'), []);
  const handleTabFav = useCallback(() => setActiveTab('favorites'), []);
  const handleTabAudit = useCallback(() => setActiveTab('audit'), []);

  return (
    <div className="flex h-screen bg-[#121212] text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-[#1E1E1E] bg-[#121212]">
        <div className="p-6 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white">
            {lockIcon}
          </div>
          <span className="text-lg font-bold tracking-tight">
            Vault<span className="text-orange-500">Secure</span>
          </span>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <SidebarItem
            active={activeTab === 'all'}
            icon={vaultIcon}
            label="All Items"
            onClick={handleTabAll}
          />
          <SidebarItem
            active={activeTab === 'favorites'}
            icon={archiveIcon}
            label="Favorites"
            onClick={handleTabFav}
          />
          <SidebarItem
            active={activeTab === 'audit'}
            icon={shieldIcon}
            label="Security Audit"
            onClick={handleTabAudit}
          />
        </nav>

        <div className="p-4 border-t border-[#1E1E1E]">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold">
              {userEmail?.[0].toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{userEmail}</p>
              <button className="text-xs text-zinc-500 hover:text-red-400 transition-colors" onClick={onSignOut}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#121212] relative">
        {/* Glass Header */}
        <header className="h-16 border-b border-[#1E1E1E] flex items-center justify-between px-6 bg-[#121212]/80 backdrop-blur-md sticky top-0 z-10 w-full">
          {/* Search */}
          <div className="flex-1 max-w-xl relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {searchIcon}
            </div>
            <input
              className="w-full bg-[#1E1E1E] text-sm text-zinc-100 rounded-lg pl-10 pr-4 py-2 border border-transparent focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all placeholder-zinc-600"
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search vault... (Cmd + K)"
              type="text"
              value={searchQuery}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 ml-6">
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-[#1E1E1E] rounded-lg transition-colors">
              {filterIcon}
            </button>
            <div className="h-4 w-px bg-[#1E1E1E] mx-1"></div>
            <div className="flex bg-[#1E1E1E] rounded-lg p-0.5">
              <button
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                onClick={() => setViewMode('grid')}>
                {gridIcon}
              </button>
              <button
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                onClick={() => setViewMode('list')}>
                {listIcon}
              </button>
            </div>
            <button
              className="ml-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-orange-500/20"
              onClick={onAdd}>
              {plusIcon}
              <span className="hidden sm:inline">Add Item</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-800">
          {filteredPasswords.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-500">
              <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4 border border-zinc-800">
                {searchLargeIcon}
              </div>
              <h3 className="text-zinc-300 font-medium mb-1">No items found</h3>
              <p className="text-sm">Try adjusting your search or add a new item.</p>
              {searchQuery && (
                <button className="mt-4 text-orange-500 text-sm hover:underline" onClick={() => setSearchQuery('')}>
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div
              className={`
              ${viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                  : 'flex flex-col gap-2'
                }
            `}>
              {filteredPasswords.map(pwd => (
                <VaultCard
                  copiedId={copiedId}
                  data={pwd}
                  key={pwd._id}
                  onCopyPass={handleCopyPass}
                  onCopyUser={handleCopyUser}
                  onDelete={onDelete}
                  onUpdate={handleUpdateWrapper}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
});

VaultDashboard.displayName = 'VaultDashboard';
