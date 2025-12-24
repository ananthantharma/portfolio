import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import React, { useCallback, useState } from 'react';

import { INoteSection } from '@/models/NoteSection';

import { ColorPicker } from './ColorPicker';
import { ICON_options, IconPicker } from './IconPicker';
import { SortableItem } from './SortableItem';

interface SectionListProps {
  isCollapsed: boolean;
  loading: boolean;
  onAddSection: (name: string, color?: string, icon?: string) => void;
  onDeleteSection: (id: string) => void;
  onRenameSection: (id: string, name: string, color?: string, icon?: string) => void;
  onReorderSections: (newOrder: INoteSection[]) => void;
  onSelectSection: (id: string) => void;
  onToggleCollapse: () => void;
  sections: INoteSection[];
  selectedSectionId: string | null;
}

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
    const [newSectionIcon, setNewSectionIcon] = useState('Bookmark');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('#000000');
    const [editIcon, setEditIcon] = useState('Bookmark');

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
        const { active, over } = event;

        if (over && active.id !== over.id) {
          const oldIndex = sections.findIndex(sec => sec._id === active.id);
          const newIndex = sections.findIndex(sec => sec._id === over.id);

          if (oldIndex !== -1 && newIndex !== -1) {
            const newOrder = arrayMove(sections, oldIndex, newIndex);
            onReorderSections(newOrder);
          }
        }
      },
      [onReorderSections, sections],
    );

    const handleAdd = () => {
      if (newSectionName.trim()) {
        onAddSection(newSectionName, newSectionColor, newSectionIcon);
        setNewSectionName('');
        setNewSectionColor('#000000');
        setNewSectionIcon('Bookmark');
        setIsAdding(false);
      }
    };

    const startEditing = (section: INoteSection) => {
      setEditingId(section._id as string);
      setEditName(section.name);
      setEditColor(section.color || '#000000');
      setEditIcon(section.icon || 'Bookmark');
    };

    const handleRename = () => {
      if (editingId && editName.trim()) {
        onRenameSection(editingId, editName, editColor, editIcon);
        setEditingId(null);
        setEditName('');
        setEditColor('#000000');
        setEditIcon('Bookmark');
      }
    };

    if (loading && !isCollapsed) {
      return (
        <div className="flex h-full items-center justify-center text-gray-400 text-sm italic">
          Loading sections...
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col border-r border-gray-200/50 bg-gray-50/30 backdrop-blur-sm">
        <div
          className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'
            } border-b border-gray-200/50 p-4 transition-all`}>
          <h2 className={`font-semibold text-gray-700 ${isCollapsed ? 'text-xs' : 'text-sm uppercase tracking-wider'}`}>
            {isCollapsed ? 'Secs' : 'Sections'}
          </h2>
          <div className="flex items-center gap-1">
            {!isCollapsed && (
              <button
                className="rounded-full p-1.5 hover:bg-gray-200/80 text-gray-500 transition-colors"
                onClick={() => setIsAdding(true)}
                title="Add Section">
                <PlusIcon className="h-4 w-4" />
              </button>
            )}
            <button
              className="rounded-full p-1.5 hover:bg-gray-200/80 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={onToggleCollapse}
              title={isCollapsed ? 'Expand' : 'Collapse'}>
              {isCollapsed ? <ChevronRightIcon className="h-3 w-3" /> : <ChevronLeftIcon className="h-3 w-3" />}
            </button>
          </div>
        </div>

        {!isCollapsed ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {isAdding && (
              <div className="mb-2 rounded-xl border border-gray-200 bg-white p-3 shadow-lg ring-1 ring-black/5">
                <div className="mb-3">
                  <input
                    autoFocus
                    className="w-full border-b border-gray-200 px-1 py-1 text-sm font-medium outline-none focus:border-blue-500 placeholder-gray-400"
                    onChange={e => setNewSectionName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAdd();
                      if (e.key === 'Escape') setIsAdding(false);
                    }}
                    placeholder="Section Name"
                    type="text"
                    value={newSectionName}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <IconPicker onSelectIcon={setNewSectionIcon} selectedIcon={newSectionIcon} />
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

            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
              <SortableContext items={sections.map(s => s._id as string)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-1">
                  {sections.map(section => (
                    <SortableItem id={section._id as string} key={section._id as string}>
                      {editingId === section._id ? (
                        <div className="rounded-xl border border-blue-100 bg-white p-3 shadow-md ring-2 ring-blue-50 relative z-20">
                          <div className="mb-3">
                            <input
                              className="w-full border-b border-gray-200 px-1 py-1 text-sm font-medium outline-none focus:border-blue-500"
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
                              onSelectIcon={setEditIcon}
                              selectedIcon={editIcon}
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
                      ) : (
                        <div
                          className={`group relative flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${selectedSectionId === section._id
                            ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200 font-medium'
                            : 'text-gray-600 hover:bg-gray-100/50 hover:text-gray-900'
                            }`}
                          onClick={() => onSelectSection(section._id as string)}>
                          {/* Accent Bar */}
                          {selectedSectionId === section._id && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-md bg-blue-500"></div>
                          )}

                          <div className="flex items-center gap-3 truncate pl-2">
                            {(() => {
                              const IconComp = ICON_options[section.icon as keyof typeof ICON_options] || ICON_options['Bookmark'];
                              return <IconComp className="h-4 w-4 opacity-70" style={{ color: section.color }} />;
                            })()}
                            <span className="truncate">{section.name}</span>
                          </div>
                          <div className="hidden space-x-1 group-hover:flex opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-blue-600"
                              onClick={e => {
                                e.stopPropagation();
                                startEditing(section);
                              }}>
                              <PencilIcon className="h-3.5 w-3.5" />
                            </button>
                            <button
                              className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-600"
                              onClick={e => {
                                e.stopPropagation();
                                if (confirm('Are you sure you want to delete this section and all its pages?')) {
                                  onDeleteSection(section._id as string);
                                }
                              }}>
                              <TrashIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </SortableItem>
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </div>
        ) : (
          // Collapsed State
          <div className="flex flex-col items-center gap-2 pt-4">
            {sections.map(section => {
              const IconComp = ICON_options[section.icon as keyof typeof ICON_options] || ICON_options['Bookmark'];
              const isSelected = selectedSectionId === section._id;
              return (
                <button
                  key={section._id as string}
                  className={`p-2 rounded-lg transition-all ${isSelected ? 'bg-white shadow-sm ring-1 ring-gray-200' : 'hover:bg-gray-100'
                    }`}
                  onClick={() => onSelectSection(section._id as string)}
                  title={section.name}
                >
                  <IconComp className={`h-5 w-5 ${isSelected ? 'text-gray-800' : 'text-gray-500'}`} style={{ color: isSelected ? undefined : section.color }} />
                </button>
              )
            })}
          </div>
        )}
      </div>
    );
  },
);

SectionList.displayName = 'SectionList';

export default SectionList;
