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
import {ChevronLeftIcon, ChevronRightIcon, PencilIcon, PlusIcon, TrashIcon} from '@heroicons/react/24/outline';
import React, {useCallback, useMemo, useState} from 'react';

import {INoteSection} from '@/models/NoteSection';

import {ColorPicker} from './ColorPicker';
import {ICON_options, IconPicker} from './IconPicker';
import {SortableItem} from './SortableItem';

interface SectionListProps {
  sections: INoteSection[];
  selectedSectionId: string | null;
  onSelectSection: (id: string) => void;
  onAddSection: (name: string, color?: string, icon?: string, image?: string | null) => void;
  onRenameSection: (id: string, name: string, color?: string, icon?: string, image?: string | null) => void;
  onDeleteSection: (id: string) => void;
  onReorderSections: (newOrder: INoteSection[]) => void;
  loading: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const SectionItem = React.memo<{
  section: INoteSection;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (section: INoteSection) => void;
  onDelete: (id: string) => void;
  isCollapsed: boolean;
}>(({section, isSelected, onSelect, onEdit, onDelete, isCollapsed}) => {
  const SectionIcon = ICON_options[section.icon as keyof typeof ICON_options] || ICON_options.Folder;

  const style = useMemo(
    () => ({
      color: section.color && section.color !== '#000000' ? section.color : undefined,
    }),
    [section.color],
  );

  const collapsedStyle = useMemo(
    () => ({
      color: isSelected ? undefined : section.color,
    }),
    [isSelected, section.color],
  );

  if (isCollapsed) {
    return (
      <button
        className={`p-2 rounded-lg transition-all ${
          isSelected ? 'bg-white shadow-sm ring-1 ring-gray-200' : 'hover:bg-gray-100'
        }`}
        onClick={() => onSelect(section._id as string)}
        title={section.name}>
        {section.image ? (
          <img
            alt={section.name}
            className="h-5 w-5 object-contain"
            onError={e => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
            src={`/api/notes/brandfetch?domain=${section.image}`}
          />
        ) : null}
        <SectionIcon
          className={`h-5 w-5 ${section.image ? 'hidden' : ''} ${isSelected ? 'text-gray-800' : 'text-gray-500'}`}
          style={collapsedStyle}
        />
      </button>
    );
  }

  return (
    <SortableItem id={section._id as string}>
      <div
        className={`group relative flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
          isSelected
            ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200 font-medium'
            : 'text-gray-600 hover:bg-gray-100/50 hover:text-gray-900'
        }`}
        onClick={() => onSelect(section._id as string)}>
        {/* Accent Bar */}
        {isSelected && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-md bg-blue-500"></div>
        )}

        <div className="flex items-center gap-3 truncate pl-2">
          {section.image ? (
            <img
              alt={section.name}
              className="h-4 w-4 object-contain"
              onError={e => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
              src={`/api/notes/brandfetch?domain=${section.image}`}
            />
          ) : null}
          <SectionIcon
            className={`h-4 w-4 shrink-0 transition-colors ${section.image ? 'hidden' : ''} ${
              isSelected ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
            }`}
            style={style}
          />
          <span className="truncate">{section.name}</span>
        </div>

        <div className="ml-auto mr-2 flex items-center gap-1">
          {section.todoCount !== undefined && section.todoCount > 0 && (
            <div className="relative flex h-4 w-4 shrink-0 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-purple-600 shadow-sm ring-1 ring-purple-200">
                {section.todoCount}
              </span>
            </div>
          )}
          {section.flaggedCount !== undefined && section.flaggedCount > 0 && (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white shadow-sm ring-1 ring-white">
              {section.flaggedCount}
            </span>
          )}
          {section.importantCount !== undefined && section.importantCount > 0 && (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-1 ring-white">
              {section.importantCount}
            </span>
          )}
        </div>

        <div className="hidden space-x-1 group-hover:flex opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-blue-600"
            onClick={e => {
              e.stopPropagation();
              onEdit(section);
            }}>
            <PencilIcon className="h-3.5 w-3.5" />
          </button>
          <button
            className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-600"
            onClick={e => {
              e.stopPropagation();
              if (confirm('Are you sure you want to delete this section and all its pages?')) {
                onDelete(section._id as string);
              }
            }}>
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </SortableItem>
  );
});

SectionItem.displayName = 'SectionItem';

const SectionList: React.FC<SectionListProps> = React.memo(
  ({
    isCollapsed,
    loading,
    onAddSection,
    onDeleteSection,
    onRenameSection,
    onReorderSections,
    onSelectSection,
    onToggleCollapse,
    sections,
    selectedSectionId,
  }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newSectionName, setNewSectionName] = useState('');
    const [newSectionColor, setNewSectionColor] = useState('#000000');
    const [newSectionIcon, setNewSectionIcon] = useState('Folder');
    const [newSectionImage, setNewSectionImage] = useState<string | null>(null);

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
          const oldIndex = sections.findIndex(s => s._id === active.id);
          const newIndex = sections.findIndex(s => s._id === over.id);

          if (oldIndex !== -1 && newIndex !== -1) {
            const newOrder = arrayMove(sections, oldIndex, newIndex);
            onReorderSections(newOrder);
          }
        }
      },
      [sections, onReorderSections],
    );

    const handleAdd = useCallback(() => {
      if (newSectionName.trim()) {
        onAddSection(newSectionName, newSectionColor, newSectionIcon, newSectionImage);
        setNewSectionName('');
        setNewSectionColor('#000000');
        setNewSectionIcon('Folder');
        setNewSectionImage(null);
        setIsAdding(false);
      }
    }, [newSectionName, newSectionColor, newSectionIcon, newSectionImage, onAddSection]);

    const startEditing = useCallback((section: INoteSection) => {
      setEditingId(section._id as string);
      setEditName(section.name);
      setEditColor(section.color || '#000000');
      setEditIcon(section.icon || 'Folder');
      setEditImage(section.image || null);
    }, []);

    const handleRename = useCallback(() => {
      if (editingId && editName.trim()) {
        onRenameSection(editingId, editName, editColor, editIcon, editImage);
        setEditingId(null);
        setEditName('');
        setEditColor('#000000');
        setEditIcon('Folder');
        setEditImage(null);
      }
    }, [editingId, editName, editColor, editIcon, editImage, onRenameSection]);

    const handleIconSelect = useCallback(
      (icon: string, image?: string | null) => {
        if (editingId) {
          setEditIcon(icon);
          setEditImage(image || null);
        } else {
          setNewSectionIcon(icon);
          setNewSectionImage(image || null);
        }
      },
      [editingId],
    );

    if (loading) {
      return (
        <div className="flex h-full items-center justify-center text-gray-500">
          {isCollapsed ? <div className="h-4 w-4 animate-pulse rounded bg-gray-200" /> : 'Loading...'}
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col border-r border-gray-200 bg-gray-50/30">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
          {!isCollapsed && <h2 className="text-xs font-semibold uppercase text-gray-400">Sections</h2>}
          <div className={`flex items-center gap-1 ${isCollapsed ? 'mx-auto flex-col' : ''}`}>
            <button
              className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              onClick={onToggleCollapse}
              title={isCollapsed ? 'Expand Sections' : 'Collapse Sections'}>
              {isCollapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
            </button>
            <button
              className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              onClick={() => {
                if (isCollapsed) onToggleCollapse();
                setIsAdding(true);
              }}
              title="Add Section">
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* List */}
        {!isCollapsed ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {isAdding && (
              <div className="mb-2 rounded-xl border border-gray-200 bg-white p-3 shadow-lg ring-1 ring-black/5 relative z-20">
                <div className="mb-3">
                  <input
                    autoFocus
                    className="w-full border-b border-gray-200 px-1 py-1 text-sm font-medium outline-none focus:border-blue-500 placeholder-gray-400 text-gray-900"
                    onChange={e => setNewSectionName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAdd();
                      if (e.key === 'Escape') setIsAdding(false);
                      e.stopPropagation();
                    }}
                    placeholder="Section Name"
                    type="text"
                    value={newSectionName}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <IconPicker
                    onSelectIcon={handleIconSelect}
                    selectedIcon={newSectionIcon}
                    selectedImage={newSectionImage}
                  />
                </div>
                <div className="mb-3">
                  <ColorPicker onSelectColor={setNewSectionColor} selectedColor={newSectionColor} />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
                    onClick={() => setIsAdding(false)}>
                    Cancel
                  </button>
                  <button
                    className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 shadow-sm shadow-blue-200"
                    onClick={handleAdd}>
                    Add
                  </button>
                </div>
              </div>
            )}

            <div
              className="flex-1 overflow-y-auto"
              onClick={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}>
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
                <SortableContext items={sections.map(s => s._id as string)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-1">
                    {sections.map(section => {
                      if (editingId === section._id) {
                        return (
                          <div
                            className="rounded-xl border border-blue-100 bg-white p-3 shadow-md ring-2 ring-blue-50 relative z-20"
                            key={section._id as string}>
                            <div className="mb-3">
                              <input
                                className="w-full border-b border-gray-200 px-1 py-1 text-sm font-medium outline-none focus:border-blue-500 text-gray-900"
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
                        <SectionItem
                          isCollapsed={false}
                          isSelected={selectedSectionId === section._id}
                          key={section._id as string}
                          onDelete={onDeleteSection}
                          onEdit={startEditing}
                          onSelect={onSelectSection}
                          section={section}
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
            {sections.map(section => (
              <SectionItem
                isCollapsed={true}
                isSelected={selectedSectionId === section._id}
                key={section._id as string}
                onDelete={onDeleteSection}
                onEdit={startEditing}
                onSelect={onSelectSection}
                section={section}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);

SectionList.displayName = 'SectionList';

export default SectionList;
