
import { Dialog, Transition } from '@headlessui/react';
import {
    CommandLineIcon,
    DocumentPlusIcon,
    MagnifyingGlassIcon,
    MoonIcon,
    SunIcon,
    HomeIcon,
    FolderIcon,
    DocumentTextIcon
} from '@heroicons/react/24/outline';
import React, { Fragment, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { INotePage } from '@/models/NotePage';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    fetchItems: (query: string, searchPageTitlesOnly: boolean, searchSectionNamesOnly: boolean) => Promise<INotePage[]>;
    onSelectTask: (task: INotePage) => void;
    onToggleDarkMode?: () => void; // Future hook
    isDarkMode?: boolean;
}

type CommandItem = {
    id: string;
    title: string;
    icon: React.ReactNode;
    action: () => void;
    shortcut?: string;
    type: 'action' | 'navigation' | 'result';
    subtitle?: string;
};

const CommandPalette: React.FC<CommandPaletteProps> = ({
    isOpen,
    onClose,
    fetchItems,
    onSelectTask,
    onToggleDarkMode,
    isDarkMode
}) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<CommandItem[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    // Default Actions
    const staticActions: CommandItem[] = [
        {
            id: 'new-page',
            title: 'Create New Page',
            icon: <DocumentPlusIcon className="w-5 h-5 text-gray-500" />,
            action: () => { console.log('Create Page Triggered'); onClose(); }, // Hook up later
            type: 'action',
            shortcut: 'N'
        },
        {
            id: 'toggle-theme',
            title: isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
            icon: isDarkMode ? <SunIcon className="w-5 h-5 text-amber-500" /> : <MoonIcon className="w-5 h-5 text-indigo-500" />,
            action: () => { onToggleDarkMode?.(); onClose(); },
            type: 'action',
            shortcut: 'D'
        },
        {
            id: 'go-home',
            title: 'Go to Dashboard',
            icon: <HomeIcon className="w-5 h-5 text-green-500" />,
            action: () => { router.push('/'); onClose(); },
            type: 'navigation'
        }
    ];

    // Search Logic
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!query.trim()) {
                setResults(staticActions);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const noteResults = await fetchItems(query, false, false);

                const mappedResults: CommandItem[] = noteResults.map(item => ({
                    id: item._id as string,
                    title: item.title || 'Untitled',
                    subtitle: (item.sectionId as any)?.name || 'Unfiled',
                    icon: (item as any).type === 'section' ? <FolderIcon className="w-5 h-5 text-blue-400" /> : <DocumentTextIcon className="w-5 h-5 text-gray-400" />,
                    action: () => onSelectTask(item),
                    type: 'result'
                }));

                // Filter static actions
                const filteredActions = staticActions.filter(action =>
                    action.title.toLowerCase().includes(query.toLowerCase())
                );

                setResults([...filteredActions, ...mappedResults]);
            } catch (error) {
                console.error('Search failed', error);
            } finally {
                setLoading(false);
                setSelectedIndex(0);
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [query]);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setResults(staticActions);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Keyboard Nav
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (results[selectedIndex]) {
                results[selectedIndex].action();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <Transition appear as={Fragment} show={isOpen}>
            <Dialog as="div" className="relative z-[100]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6 md:p-20">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <Dialog.Panel className="mx-auto max-w-2xl transform divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5 transition-all">
                            <div className="relative">
                                <MagnifyingGlassIcon
                                    className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400"
                                    aria-hidden="true"
                                />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
                                    placeholder="Type a command or search..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                />
                            </div>

                            {results.length > 0 && (
                                <ul className="max-h-[60vh] scroll-py-2 overflow-y-auto py-2 text-sm text-gray-800">
                                    {results.map((item, index) => (
                                        <li
                                            key={item.id}
                                            className={`cursor-default select-none px-4 py-3 group flex items-center justify-between transition-colors ${selectedIndex === index ? 'bg-indigo-600 text-white' : 'hover:bg-gray-50'
                                                }`}
                                            onClick={() => item.action()}
                                            onMouseEnter={() => setSelectedIndex(index)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded-lg ${selectedIndex === index ? 'bg-indigo-500/50 text-white' : 'bg-gray-100'
                                                    }`}>
                                                    {/* Clone element to force color change if needed, but CSS classes handle it mostly */}
                                                    {React.cloneElement(item.icon as React.ReactElement, {
                                                        className: `w-5 h-5 ${selectedIndex === index ? 'text-white' : ''}`
                                                    })}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`font-medium ${selectedIndex === index ? 'text-white' : 'text-gray-900'}`}>{item.title}</span>
                                                    {item.subtitle && <span className={`text-xs ${selectedIndex === index ? 'text-indigo-200' : 'text-gray-500'}`}>{item.subtitle}</span>}
                                                </div>
                                            </div>
                                            {item.shortcut && (
                                                <span className={`text-xs font-mono px-2 py-1 rounded ${selectedIndex === index ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {item.shortcut}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {query !== '' && results.length === 0 && !loading && (
                                <div className="py-14 text-center text-sm sm:px-14">
                                    <CommandLineIcon className="mx-auto h-6 w-6 text-gray-300" aria-hidden="true" />
                                    <p className="mt-4 font-semibold text-gray-900">No results found</p>
                                    <p className="mt-2 text-gray-500">We couldn’t find anything with that term.</p>
                                </div>
                            )}
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
};

export default CommandPalette;
