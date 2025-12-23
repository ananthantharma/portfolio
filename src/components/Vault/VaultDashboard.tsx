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
import React, {useMemo, useState} from 'react';

import {PasswordEntry} from '../../data/dataDef';

interface VaultDashboardProps {
  passwords: PasswordEntry[];
  onAdd: () => void;
  onUpdate: (id: string, data: Partial<PasswordEntry>) => void;
  onDelete: (id: string) => void;
  userEmail?: string | null;
  onSignOut: () => void;
}

const getFavicon = (url: string) => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return 'https://ui-avatars.com/api/?name=Vault&background=random';
  }
};

const SecurityBadge = ({password}: {password: string}) => {
  const isWeak = !password || password.length < 8;
  return (
    <div
      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
        isWeak
          ? 'bg-red-500/10 border-red-500/20 text-red-500'
          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
      }`}>
      {isWeak ? <ShieldAlert size={10} /> : <ShieldCheck size={10} />}
      {isWeak ? 'Weak' : 'Secure'}
    </div>
  );
};

export const VaultDashboard: React.FC<VaultDashboardProps> = ({
  passwords,
  onAdd,
  onUpdate,
  onDelete,
  userEmail,
  onSignOut,
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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex h-screen bg-[#121212] text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-[#1E1E1E] bg-[#121212]">
        <div className="p-6 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white">
            <Lock size={16} strokeWidth={3} />
          </div>
          <span className="text-lg font-bold tracking-tight">
            Vault<span className="text-orange-500">Secure</span>
          </span>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <SidebarItem
            active={activeTab === 'all'}
            icon={<Vault size={18} />}
            label="All Items"
            onClick={() => setActiveTab('all')}
          />
          <SidebarItem
            active={activeTab === 'favorites'}
            icon={<Archive size={18} />}
            label="Favorites"
            onClick={() => setActiveTab('favorites')}
          />
          <SidebarItem
            active={activeTab === 'audit'}
            icon={<ShieldCheck size={18} />}
            label="Security Audit"
            onClick={() => setActiveTab('audit')}
          />
        </nav>

        <div className="p-4 border-t border-[#1E1E1E]">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold">
              {userEmail?.[0].toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{userEmail}</p>
              <button onClick={onSignOut} className="text-xs text-zinc-500 hover:text-red-400 transition-colors">
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
              <Search size={16} className="text-zinc-500 group-focus-within:text-orange-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search vault... (Cmd + K)"
              className="w-full bg-[#1E1E1E] text-sm text-zinc-100 rounded-lg pl-10 pr-4 py-2 border border-transparent focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all placeholder-zinc-600"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 ml-6">
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-[#1E1E1E] rounded-lg transition-colors">
              <Filter size={18} />
            </button>
            <div className="h-4 w-px bg-[#1E1E1E] mx-1"></div>
            <div className="flex bg-[#1E1E1E] rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'grid' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}>
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'list' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}>
                <LayoutList size={16} />
              </button>
            </div>
            <button
              onClick={onAdd}
              className="ml-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-orange-500/20">
              <Plus size={16} />
              <span className="hidden sm:inline">Add Item</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-800">
          {filteredPasswords.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-500">
              <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4 border border-zinc-800">
                <Search size={32} className="opacity-20" />
              </div>
              <h3 className="text-zinc-300 font-medium mb-1">No items found</h3>
              <p className="text-sm">Try adjusting your search or add a new item.</p>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="mt-4 text-orange-500 text-sm hover:underline">
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div
              className={`
              ${
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                  : 'flex flex-col gap-2'
              }
            `}>
              {filteredPasswords.map(pwd => (
                <VaultCard
                  key={pwd._id}
                  data={pwd}
                  viewMode={viewMode}
                  onCopyUser={() => copyToClipboard(pwd.username || '', `user-${pwd._id}`)}
                  onCopyPass={() => copyToClipboard(pwd.password || '', `pass-${pwd._id}`)}
                  onDelete={() => onDelete(pwd._id)}
                  onUpdate={() => onUpdate(pwd._id, {})} // Placeholder
                  copiedId={copiedId}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const SidebarItem = ({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
      active ? 'bg-orange-500/10 text-orange-500' : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#1E1E1E]'
    }`}>
    {icon}
    {label}
  </button>
);

const VaultCard = ({
  data,
  viewMode,
  onCopyUser,
  onCopyPass,
  onDelete,
  onUpdate,
  copiedId,
}: {
  data: PasswordEntry;
  viewMode: 'grid' | 'list';
  onCopyUser: () => void;
  onCopyPass: () => void;
  onDelete: () => void;
  onUpdate: () => void;
  copiedId: string | null;
}) => {
  const isCopiedUser = copiedId === `user-${data._id}`;
  const isCopiedPass = copiedId === `pass-${data._id}`;

  return (
    <div
      className={`
      group relative bg-[#1E1E1E] hover:bg-[#252525] border border-transparent hover:border-zinc-700 
      transition-all duration-200 cursor-pointer overflow-hidden
      ${
        viewMode === 'grid'
          ? 'rounded-xl p-5 flex flex-col gap-4 hover:-translate-y-1 hover:shadow-xl'
          : 'rounded-lg p-3 flex items-center gap-4'
      }
    `}>
      {/* Icon & Title */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0 p-2">
          {data.site ? (
            <img src={getFavicon(data.site)} alt="favicon" className="w-full h-full object-contain" />
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
        ${
          viewMode === 'grid'
            ? 'pt-3 border-t border-zinc-800/50 justify-between opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity'
            : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity'
        }
      `}>
        <div className="flex items-center gap-1">
          <ActionButton active={isCopiedUser} icon={<Copy size={14} />} onClick={onCopyUser} tooltip="Copy User" />
          <ActionButton
            active={isCopiedPass}
            icon={isCopiedPass ? <ShieldCheck size={14} /> : <Eye size={14} />}
            onClick={onCopyPass}
            tooltip="Copy Password"
          />
          <ActionButton active={false} icon={<PenLine size={14} />} onClick={onUpdate} tooltip="Edit" />
          {data.site && (
            <a
              href={data.site}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors">
              <ExternalLink size={14} />
            </a>
          )}
        </div>

        {viewMode === 'grid' && (
          <button
            onClick={e => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {viewMode === 'list' && (
        <button
          onClick={e => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors opacity-0 group-hover:opacity-100">
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
};

const ActionButton = ({
  icon,
  onClick,
  active,
  tooltip,
}: {
  icon: React.ReactNode;
  onClick: (e: any) => void;
  active?: boolean;
  tooltip?: string;
}) => (
  <button
    onClick={e => {
      e.stopPropagation();
      onClick(e);
    }}
    className={`p-1.5 rounded-md transition-colors ${
      active ? 'bg-emerald-500/10 text-emerald-500' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'
    }`}
    title={tooltip}>
    {icon}
  </button>
);
