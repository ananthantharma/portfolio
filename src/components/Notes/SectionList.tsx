import { closestCenter, DndContext, DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, PencilIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import React, { useCallback, useState } from 'react';

import { INoteSection } from '@/models/NoteSection';

import { SortableItem } from './SortableItem';

interface SectionListProps {
    isCollapsed: boolean;
    loading: boolean;
    onAddSection: (name: string, color?: string) => void;
    onDeleteSection: (id: string) => void;
    onRenameSection: (id: string, name: string, color?: string) => void;
    onReorderSections: (newOrder: INoteSection[]) => void;
    onSelectSection: (id: string) => void;
    onToggleCollapse: () => void;
    sections: INoteSection[];
    selectedSectionId: string | null;
}

const SectionList: React.FC<SectionListProps> = React.memo(
    ({ isCollapsed, loading, onAddSection, onDeleteSection, onRenameSection, onReorderSections, onSelectSection, onToggleCollapse, sections, selectedSectionId }) => {
        const [isAdding, setIsAdding] = useState(false);
        const [newSectionName, setNewSectionName] = useState('');
        const [newSectionColor, setNewSectionColor] = useState('#000000');
        const [editingId, setEditingId] = useState<string | null>(null);
        const [editName, setEditName] = useState('');
        const [editColor, setEditColor] = useState('#000000');

        const sensors = useSensors(
            useSensor(PointerSensor),
            useSensor(KeyboardSensor, {
                coordinateGetter: sortableKeyboardCoordinates,
            })
        );

        const handleDragEnd = useCallback((event: DragEndEvent) => {
            const { active, over } = event;

            if (over && active.id !== over.id) {
                const oldIndex = sections.findIndex((sec) => sec._id === active.id);
                const newIndex = sections.findIndex((sec) => sec._id === over.id);

                if (oldIndex !== -1 && newIndex !== -1) {
                    const newOrder = arrayMove(sections, oldIndex, newIndex);
                    onReorderSections(newOrder);
                }
            }
        }, [onReorderSections, sections]);

        const handleAdd = () => {
            if (newSectionName.trim()) {
                onAddSection(newSectionName, newSectionColor);
                setNewSectionName('');
                setNewSectionColor('#000000');
                setIsAdding(false);
            }
        };

        const startEditing = (section: INoteSection) => {
            setEditingId(section._id as string);
            setEditName(section.name);
            setEditColor(section.color || '#000000');
        };

        const handleRename = () => {
            if (editingId && editName.trim()) {
                onRenameSection(editingId, editName, editColor);
                setEditingId(null);
                setEditName('');
                setEditColor('#000000');
            }
        };

        if (loading && !isCollapsed) {
            return <div className="flex h-full items-center justify-center text-gray-500">Loading sections...</div>;
        }

        return (
            <div className="flex h-full flex-col border-r border-gray-200 bg-gray-50">
                <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'} border-b border-gray-200 p-4 transition-all`}>
                    <h2 className={`font-semibold text-gray-700 ${isCollapsed ? 'text-lg' : 'text-lg'}`}>
                        {isCollapsed ? 'S' : 'Sections'}
                    </h2>
                    <div className="flex items-center gap-1">
                        {!isCollapsed && (
                            <button
                                className="rounded-full p-1 hover:bg-gray-200 text-gray-600"
                                onClick={() => setIsAdding(true)}
                                title="Add Section">
                                <PlusIcon className="h-5 w-5" />
                            </button>
                        )}
                        <button
                            className="rounded-full p-1 hover:bg-gray-200 text-gray-500"
                            onClick={onToggleCollapse}
                            title={isCollapsed ? "Expand" : "Collapse"}
                        >
                            {isCollapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                {!isCollapsed && (
                    <div className="flex-1 overflow-y-auto">
                        {isAdding && (
                            <div className="p-2">
                                <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                                    <input
                                        className="h-6 w-6 cursor-pointer rounded-full border-0 p-0"
                                        onChange={(e) => setNewSectionColor(e.target.value)}
                                        title="Pick a color"
                                        type="color"
                                        value={newSectionColor}
                                    />
                                    <input
                                        autoFocus
                                        className="w-full border-none p-0 text-sm focus:ring-0 text-gray-900"
                                        onChange={e => setNewSectionName(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleAdd();
                                            if (e.key === 'Escape') setIsAdding(false);
                                        }}
                                        placeholder="New Section"
                                        type="text"
                                        value={newSectionName}
                                    />
                                    <button className="text-green-600" onClick={handleAdd}>
                                        <CheckIcon className="h-4 w-4" />
                                    </button>
                                    <button className="text-red-600" onClick={() => setIsAdding(false)}>
                                        <XMarkIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        <DndContext
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                            sensors={sensors}
                        >
                            <SortableContext
                                items={sections.map(s => s._id as string)}
                                strategy={verticalListSortingStrategy}
                            >
                                <ul className="space-y-1 p-2">
                                    {sections.map(section => (
                                        <SortableItem id={section._id as string} key={section._id as string}>
                                            {editingId === section._id ? (
                                                <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                                                    <input
                                                        className="h-6 w-6 cursor-pointer rounded-full border-0 p-0"
                                                        onChange={(e) => setEditColor(e.target.value)}
                                                        onKeyDown={e => e.stopPropagation()}
                                                        onPointerDown={e => e.stopPropagation()}
                                                        title="Pick a color"
                                                        type="color"
                                                        value={editColor}
                                                    />
                                                    <input
                                                        autoFocus
                                                        className="w-full border-none p-0 text-sm focus:ring-0 text-gray-900"
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
                                                    <button className="text-green-600" onClick={handleRename}>
                                                        <CheckIcon className="h-4 w-4" />
                                                    </button>
                                                    <button className="text-red-600" onClick={() => setEditingId(null)}>
                                                        <XMarkIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div
                                                    className={`group flex cursor-pointer items-center justify-between rounded-md p-2 text-sm ${selectedSectionId === section._id
                                                        ? 'bg-blue-100 text-blue-900'
                                                        : 'text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                    onClick={() => onSelectSection(section._id as string)}>
                                                    <div className="flex items-center gap-2 truncate">
                                                        {section.color && (
                                                            <span
                                                                className="h-3 w-3 rounded-full flex-shrink-0"
                                                                style={{ backgroundColor: section.color }}
                                                            />
                                                        )}
                                                        <span className="truncate">{section.name}</span>
                                                    </div>
                                                    <div className="hidden space-x-1 group-hover:flex">
                                                        <button
                                                            className="text-gray-500 hover:text-blue-600"
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                startEditing(section);
                                                            }}>
                                                            <PencilIcon className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            className="text-gray-500 hover:text-red-600"
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                if (confirm('Are you sure you want to delete this section and all its pages?')) {
                                                                    onDeleteSection(section._id as string);
                                                                }
                                                            }}>
                                                            <TrashIcon className="h-4 w-4" />
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
                )}
            </div>
        );
    },
);

SectionList.displayName = 'SectionList';

export default SectionList;
