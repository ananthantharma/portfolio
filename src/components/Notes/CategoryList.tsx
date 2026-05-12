import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {ArrowsUpDownIcon, ChevronLeftIcon, ChevronRightIcon, CircleStackIcon, PencilIcon, PlusIcon, StarIcon, TrashIcon} from '@heroicons/react/24/outline';
import React, {useCallback, useEffect, useMemo, useState} from 'react';

// ─── Monogram helpers ─────────────────────────────────────────────────────────

const PASTEL_PAIRS: [string, string][] = [
  ['#EAF3DE', '#27500A'],
  ['#EDF2FF', '#1E3A8A'],
  ['#FFF7ED', '#7C2D12'],
  ['#F5F3FF', '#4C1D95'],
  ['#FFF1F2', '#881337'],
  ['#ECFDF5', '#064E3B'],
  ['#FFF9F0', '#7C3400'],
  ['#EEF2FF', '#312E81'],
  ['#F0FDFA', '#134E4A'],
  ['#FDF4FF', '#581C87'],
  ['#F7FEE7', '#365314'],
  ['#ECFEFF', '#164E63'],
];

function getMonogramPastel(name: string): [string, string] {
  const hash = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return PASTEL_PAIRS[hash % PASTEL_PAIRS.length];
}

function getMonogram(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

import {useSession} from 'next-auth/react';

import {INoteCategory} from '@/models/NoteCategory';

import {useBadgeSettings} from './BadgeSettingsContext';
import {ColorPicker} from './ColorPicker';
import {IconPicker} from './IconPicker';
import {SortableItem} from './SortableItem';

interface CategoryListProps {
  categories: INoteCategory[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string) => void;
  onAddCategory: (name: string, color?: string, icon?: string, image?: string | null) => Promise<void>;
  onRenameCategory: (id: string, name: string, color?: string, icon?: string, image?: string | null) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onReorderCategories: (newOrder: INoteCategory[]) => void;
  loading: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  badgeCounts?: Record<string, {todo: {count: number; minDays: number | null}; important: number; flagged: number}>;
  dbSize?: string | null;
}

// Extracted Item Component to handle memoization
const CategoryItem = React.memo<{
  category: INoteCategory;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (category: INoteCategory) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  isPinned: boolean;
  isCollapsed: boolean;
  badgeStats?: {todo: {count: number; minDays: number | null}; important: number; flagged: number};
}>(({category, isSelected, onSelect, onEdit, onDelete, onTogglePin, isPinned, isCollapsed, badgeStats}) => {
  const {getBadgeStyle} = useBadgeSettings();

  const renderBadges = () => {
    if (!badgeStats) return null;
    const {todo} = badgeStats;
    if (!todo || todo.count === 0) return null;

    // Replaced custom badge logic with getBadgeStyle
    const {className, style} = getBadgeStyle(todo.minDays);

    return (
      <div className={`flex items-center gap-1 ${isCollapsed ? 'absolute -top-1 -right-2' : 'flex-shrink-0'}`}>
        <span
          className={`flex h-3 min-w-[12px] items-center justify-center rounded-full px-1 text-[8px] font-bold text-white shadow-sm ring-1 ring-white ${className}`}
          style={style}>
          {todo.count}
        </span>
      </div>
    );
  };

  if (isCollapsed) {
    const [monoBg, monoFg] = getMonogramPastel(category.name);
    return (
      <button
        className={`relative p-1.5 rounded-lg transition-all duration-150 ${
          isSelected ? 'bg-slate-100' : 'hover:bg-black/[0.04]'
        }`}
        onClick={() => onSelect(category._id as string)}
        title={category.name}>
        {category.image ? (
          <img
            alt={category.name}
            className="h-6 w-6 rounded-md object-contain"
            onError={e => {
              e.currentTarget.style.display = 'none';
              (e.currentTarget.nextSibling as HTMLElement)?.classList.remove('hidden');
            }}
            src={`https://logo.clearbit.com/${category.image}`}
          />
        ) : null}
        <div
          className={`h-6 w-6 rounded-md flex items-center justify-center text-[9px] font-bold ${category.image ? 'hidden' : ''}`}
          style={{backgroundColor: monoBg, color: monoFg}}>
          {getMonogram(category.name)}
        </div>
        {renderBadges()}
        {isPinned && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-400 ring-1 ring-white" />
        )}
      </button>
    );
  }

  const [monoBg, monoFg] = getMonogramPastel(category.name);
  return (
    <SortableItem id={category._id as string}>
      <div
        className={`group relative flex cursor-pointer items-center justify-between rounded-lg px-[10px] py-[7px] text-[12.5px] transition-all duration-150 ${
          isSelected
            ? 'bg-slate-100/80 text-slate-900 font-semibold'
            : 'text-slate-500 hover:bg-black/[0.04] hover:text-slate-900'
        }`}
        onClick={() => onSelect(category._id as string)}>

        <div className="flex items-center gap-2.5 overflow-hidden">
          {/* Monogram avatar / Clearbit logo */}
          {category.image ? (
            <img
              alt={category.name}
              className="h-[18px] w-[18px] rounded-md object-contain flex-shrink-0"
              onError={e => {
                e.currentTarget.style.display = 'none';
                (e.currentTarget.nextSibling as HTMLElement)?.classList.remove('hidden');
              }}
              src={`https://logo.clearbit.com/${category.image}`}
            />
          ) : null}
          <div
            className={`h-[18px] w-[18px] rounded-md flex items-center justify-center text-[8px] font-bold flex-shrink-0 ${category.image ? 'hidden' : ''}`}
            style={{backgroundColor: monoBg, color: monoFg}}>
            {getMonogram(category.name)}
          </div>
          <span className="truncate">{category.name}</span>
        </div>

        <div className="ml-auto flex items-center gap-0.5">
          {renderBadges()}
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              className={`rounded p-1 transition-colors ${isPinned ? 'text-amber-400 hover:bg-amber-50' : 'text-slate-300 hover:bg-slate-100 hover:text-amber-400'}`}
              onClick={e => {
                e.stopPropagation();
                onTogglePin(category._id as string);
              }}
              title={isPinned ? 'Unpin' : 'Pin to top'}>
              <StarIcon className="h-3 w-3" />
            </button>
            <button
              className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-indigo-600 transition-colors"
              onClick={e => {
                e.stopPropagation();
                onEdit(category);
              }}>
              <PencilIcon className="h-3.5 w-3.5" />
            </button>
            <button
              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              onClick={e => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this notebook?')) {
                  onDelete(category._id as string);
                }
              }}>
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </SortableItem>
  );
});

CategoryItem.displayName = 'CategoryItem';

const CategoryList: React.FC<CategoryListProps> = React.memo(
  ({
    categories,
    isCollapsed,
    loading,
    onAddCategory,
    onDeleteCategory,
    onRenameCategory,
    onReorderCategories,
    onSelectCategory,
    onToggleCollapse,
    selectedCategoryId,
    badgeCounts,
    dbSize,
  }) => {
    const [isAdding, setIsAdding] = useState(false);

    const {data: session} = useSession();
    const userName = useMemo(() => {
      const n = (session?.user as any)?.name || session?.user?.email || '';
      return n.split(' ')[0].split('@')[0];
    }, [session]);
    const userInitial = useMemo(() => {
      const n = (session?.user as any)?.name || session?.user?.email || 'U';
      return n.charAt(0).toUpperCase();
    }, [session]);

    // ── Pinned notebooks (persisted) ──────────────────────────────────────────
    const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
      if (typeof window === 'undefined') return new Set<string>();
      try {
        const saved = localStorage.getItem('NOTES_PINNED_CATEGORIES');
        return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
      } catch { return new Set<string>(); }
    });

    useEffect(() => {
      localStorage.setItem('NOTES_PINNED_CATEGORIES', JSON.stringify([...pinnedIds]));
    }, [pinnedIds]);

    const togglePin = useCallback((id: string) => {
      setPinnedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    }, []);

    // ── Sort ─────────────────────────────────────────────────────────────────
    const [sortAlpha, setSortAlpha] = useState(false);

    const pinnedCategories = useMemo(
      () => categories.filter(c => pinnedIds.has(c._id as string)),
      [categories, pinnedIds],
    );
    const unpinnedCategories = useMemo(() => {
      const rest = categories.filter(c => !pinnedIds.has(c._id as string));
      if (sortAlpha) return [...rest].sort((a, b) => a.name.localeCompare(b.name));
      return rest;
    }, [categories, pinnedIds, sortAlpha]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState('#000000');
    const [newCategoryIcon, setNewCategoryIcon] = useState('Folder');
    const [newCategoryImage, setNewCategoryImage] = useState<string | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('#000000');
    const [editIcon, setEditIcon] = useState('Folder');
    const [editImage, setEditImage] = useState<string | null>(null);

    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8,
        },
      }),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      }),
    );

    const handleDragEnd = useCallback(
      (event: DragEndEvent) => {
        const {active, over} = event;

        if (over && active.id !== over.id) {
          const oldIndex = unpinnedCategories.findIndex(c => c._id === active.id);
          const newIndex = unpinnedCategories.findIndex(c => c._id === over.id);

          if (oldIndex !== -1 && newIndex !== -1) {
            const reorderedUnpinned = arrayMove(unpinnedCategories, oldIndex, newIndex);
            onReorderCategories([...pinnedCategories, ...reorderedUnpinned]);
          }
        }
      },
      [unpinnedCategories, pinnedCategories, onReorderCategories],
    );

    const handleAdd = useCallback(() => {
      if (newCategoryName.trim()) {
        onAddCategory(newCategoryName, newCategoryColor, newCategoryIcon, newCategoryImage);
        setNewCategoryName('');
        setNewCategoryColor('#000000');
        setNewCategoryIcon('Folder');
        setNewCategoryImage(null);
        setIsAdding(false);
      }
    }, [newCategoryName, newCategoryColor, newCategoryIcon, newCategoryImage, onAddCategory]);

    const startEditing = useCallback((category: INoteCategory) => {
      setEditingId(category._id as string);
      setEditName(category.name);
      setEditColor(category.color || '#000000');
      setEditIcon(category.icon || 'Folder');
      setEditImage(category.image || null);
    }, []);

    const handleRename = useCallback(() => {
      if (editingId && editName.trim()) {
        onRenameCategory(editingId, editName, editColor, editIcon, editImage);
        setEditingId(null);
        setEditName('');
        setEditColor('#000000');
        setEditIcon('Folder');
        setEditImage(null);
      }
    }, [editingId, editName, editColor, editIcon, editImage, onRenameCategory]);

    const handleIconSelect = useCallback(
      (icon: string, image?: string | null) => {
        if (editingId) {
          setEditIcon(icon);
          setEditImage(image || null);
        } else {
          setNewCategoryIcon(icon);
          setNewCategoryImage(image || null);
        }
      },
      [editingId],
    );

    if (loading) {
      return (
        <div className="flex h-full flex-col gap-2 p-3">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-8 rounded-lg bg-slate-200/60 animate-pulse"
              style={{animationDelay: `${i * 100}ms`}}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0">
          {!isCollapsed && (
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400/80">Notebooks</h2>
          )}
          <div className={`flex items-center gap-0.5 ${isCollapsed ? 'mx-auto flex-col' : ''}`}>
            {!isCollapsed && (
              <button
                className={`rounded-md p-1 transition-all duration-150 ${sortAlpha ? 'text-violet-500 bg-violet-50' : 'text-slate-400 hover:bg-black/[0.04] hover:text-slate-600'}`}
                onClick={() => setSortAlpha(v => !v)}
                title="Sort alphabetically">
                <ArrowsUpDownIcon className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              className="rounded-md p-1 text-slate-400 hover:bg-black/[0.04] hover:text-slate-600 transition-all duration-150"
              onClick={onToggleCollapse}
              title={isCollapsed ? 'Expand Notebooks' : 'Collapse Notebooks'}>
              {isCollapsed ? <ChevronRightIcon className="h-3.5 w-3.5" /> : <ChevronLeftIcon className="h-3.5 w-3.5" />}
            </button>
            <button
              className="rounded-md p-1 text-slate-400 hover:bg-black/[0.04] hover:text-slate-600 transition-all duration-150"
              onClick={() => {
                if (isCollapsed) onToggleCollapse();
                setIsAdding(true);
              }}
              title="Add Notebook">
              <PlusIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* List */}
        {!isCollapsed ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 min-h-0">
            {isAdding && (
              <div className="mb-2 rounded-xl border border-black/[0.06] bg-white p-3 shadow-lg relative z-20">
                <div className="mb-3">
                  <input
                    autoFocus
                    className="w-full border-b border-black/[0.06] px-1 py-1 text-[13px] font-medium outline-none focus:border-indigo-500 text-gray-900"
                    onChange={e => setNewCategoryName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAdd();
                      if (e.key === 'Escape') setIsAdding(false);
                      e.stopPropagation();
                    }}
                    onPointerDown={e => e.stopPropagation()}
                    placeholder="Notebook Name"
                    type="text"
                    value={newCategoryName}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <IconPicker
                    onSelectIcon={handleIconSelect}
                    selectedIcon={newCategoryIcon}
                    selectedImage={newCategoryImage}
                  />
                </div>
                <div className="mb-3">
                  <ColorPicker onSelectColor={setNewCategoryColor} selectedColor={newCategoryColor} />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
                    onClick={() => setIsAdding(false)}>
                    Cancel
                  </button>
                  <button
                    className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 shadow-sm"
                    onClick={handleAdd}>
                    Add
                  </button>
                </div>
              </div>
            )}

            <div
              onClick={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}>

              {/* Pinned notebooks */}
              {pinnedCategories.length > 0 && (
                <>
                  <p className="px-1.5 pb-0.5 pt-1 text-[9px] font-bold uppercase tracking-widest text-slate-400/60">Pinned</p>
                  <ul className="space-y-0.5 mb-2">
                    {pinnedCategories.map(category => {
                      if (editingId === category._id) {
                        return (
                          <div
                            className="rounded-xl border border-indigo-100 bg-white p-3 shadow-md ring-1 ring-indigo-50 relative z-20"
                            key={category._id as string}>
                            <div className="mb-3">
                              <input
                                autoFocus
                                className="w-full border-b border-black/[0.06] px-1 py-1 text-[13px] font-medium outline-none focus:border-indigo-500 text-gray-900"
                                onChange={e => setEditName(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleRename();
                                  if (e.key === 'Escape') setEditingId(null);
                                  e.stopPropagation();
                                }}
                                onPointerDown={e => e.stopPropagation()}
                                type="text"
                                value={editName}
                              />
                            </div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <IconPicker
                                onSelectIcon={handleIconSelect}
                                selectedIcon={editIcon}
                                selectedImage={editImage}
                              />
                            </div>
                            <div className="mb-3">
                              <ColorPicker onSelectColor={setEditColor} selectedColor={editColor} />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
                                onClick={() => setEditingId(null)}>
                                Cancel
                              </button>
                              <button
                                className="rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 shadow-sm shadow-green-200"
                                onClick={handleRename}>
                                Save
                              </button>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <CategoryItem
                          category={category}
                          isCollapsed={false}
                          isSelected={selectedCategoryId === category._id}
                          isPinned
                          key={category._id as string}
                          onDelete={onDeleteCategory}
                          onEdit={startEditing}
                          onSelect={onSelectCategory}
                          onTogglePin={togglePin}
                          badgeStats={badgeCounts?.[category._id as string]}
                        />
                      );
                    })}
                  </ul>
                  <p className="px-1.5 pb-0.5 pt-1 text-[9px] font-bold uppercase tracking-widest text-slate-400/60">All</p>
                </>
              )}

              {/* All notebooks (DnD-sortable, unpinned only) */}
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
                <SortableContext items={unpinnedCategories.map(c => c._id as string)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-0.5">
                    {unpinnedCategories.map(category => {
                      if (editingId === category._id) {
                        return (
                          <div
                            className="rounded-xl border border-indigo-100 bg-white p-3 shadow-md ring-1 ring-indigo-50 relative z-20"
                            key={category._id as string}>
                            <div className="mb-3">
                              <input
                                autoFocus
                                className="w-full border-b border-black/[0.06] px-1 py-1 text-[13px] font-medium outline-none focus:border-indigo-500 text-gray-900"
                                onChange={e => setEditName(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleRename();
                                  if (e.key === 'Escape') setEditingId(null);
                                  e.stopPropagation();
                                }}
                                onPointerDown={e => e.stopPropagation()}
                                type="text"
                                value={editName}
                              />
                            </div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <IconPicker
                                onSelectIcon={handleIconSelect}
                                selectedIcon={editIcon}
                                selectedImage={editImage}
                              />
                            </div>
                            <div className="mb-3">
                              <ColorPicker onSelectColor={setEditColor} selectedColor={editColor} />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
                                onClick={() => setEditingId(null)}>
                                Cancel
                              </button>
                              <button
                                className="rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 shadow-sm shadow-green-200"
                                onClick={handleRename}>
                                Save
                              </button>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <CategoryItem
                          category={category}
                          isCollapsed={false}
                          isSelected={selectedCategoryId === category._id}
                          isPinned={false}
                          key={category._id as string}
                          onDelete={onDeleteCategory}
                          onEdit={startEditing}
                          onSelect={onSelectCategory}
                          onTogglePin={togglePin}
                          badgeStats={badgeCounts?.[category._id as string]}
                        />
                      );
                    })}
                  </ul>
                </SortableContext>
              </DndContext>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 pt-4">
            {categories.map(category => (
              <CategoryItem
                category={category}
                isCollapsed={true}
                isSelected={selectedCategoryId === category._id}
                isPinned={pinnedIds.has(category._id as string)}
                key={category._id as string}
                onDelete={onDeleteCategory}
                onEdit={startEditing}
                onSelect={onSelectCategory}
                onTogglePin={togglePin}
                badgeStats={badgeCounts?.[category._id as string]}
              />
            ))}
          </div>
        )}

        {/* User chip + storage footer */}
        {!isCollapsed && (
          <div className="flex-shrink-0 border-t border-slate-100/60">
            <div className="flex items-center gap-2 px-3 py-2.5">
              {session?.user?.image ? (
                <img src={session.user.image} alt="avatar" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-[9px] font-bold">{userInitial}</span>
                </div>
              )}
              <span className="text-[11px] font-medium text-slate-600 truncate flex-1">{userName}</span>
              {dbSize && (
                <span className="flex items-center gap-1 text-[10px] text-slate-300 flex-shrink-0">
                  <CircleStackIcon className="h-2.5 w-2.5" />
                  {dbSize}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
);

CategoryList.displayName = 'CategoryList';

export default CategoryList;
