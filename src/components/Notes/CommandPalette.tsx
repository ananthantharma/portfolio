/* eslint-disable simple-import-sort/imports, react-memo/require-usememo, react/jsx-sort-props, react-memo/require-memo */
import {Dialog, Transition} from '@headlessui/react';
import {
  CommandLineIcon,
  DocumentPlusIcon,
  MagnifyingGlassIcon,
  HomeIcon,
  FolderIcon,
  DocumentTextIcon,
  SparklesIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import React, {Fragment, useEffect, useState, useRef} from 'react';
import {useRouter} from 'next/navigation';
import {INotePage} from '@/models/NotePage';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  fetchItems: (query: string, searchPageTitlesOnly: boolean, searchSectionNamesOnly: boolean) => Promise<INotePage[]>;
  onSelectTask: (task: INotePage) => void;
  onCreatePage?: () => void;
  currentPageContent?: string;
  currentPageTitle?: string;
}

type CommandItem = {
  id: string;
  title: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
  category: 'action' | 'navigation' | 'result' | 'recent' | 'ai';
  subtitle?: string;
};

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  fetchItems,
  onSelectTask,
  onCreatePage,
  currentPageContent,
  currentPageTitle,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CommandItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [recentPages, setRecentPages] = useState<INotePage[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Load recent pages
  useEffect(() => {
    if (isOpen) {
      fetchItems('', false, false)
        .then(pages => {
          setRecentPages(pages.slice(0, 5));
        })
        .catch(() => {});
    }
  }, [isOpen, fetchItems]);

  // AI Summarize handler
  const handleAISummarize = async () => {
    if (!currentPageContent || isSummarizing) return;
    setIsSummarizing(true);
    setAiSummary(null);
    try {
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          prompt: `Summarize the following note in 2-3 concise bullet points. Be specific and actionable.\n\nTitle: ${
            currentPageTitle || 'Untitled'
          }\n\nContent:\n${currentPageContent.substring(0, 3000)}`,
        }),
      });
      const data = await res.json();
      if (data.text || data.result) {
        setAiSummary(data.text || data.result);
      }
    } catch (err) {
      console.error('AI Summary failed:', err);
      setAiSummary('Failed to generate summary.');
    } finally {
      setIsSummarizing(false);
    }
  };

  // Build static actions
  const getStaticActions = (): CommandItem[] => {
    const actions: CommandItem[] = [];

    if (onCreatePage) {
      actions.push({
        id: 'new-page',
        title: 'Create New Page',
        icon: <DocumentPlusIcon className="w-4 h-4" />,
        action: () => {
          onCreatePage();
          onClose();
        },
        category: 'action',
        shortcut: '⌘N',
      });
    }

    if (currentPageContent) {
      actions.push({
        id: 'ai-summarize',
        title: 'AI Summarize Current Page',
        icon: <SparklesIcon className="w-4 h-4" />,
        action: handleAISummarize,
        category: 'ai',
        subtitle: currentPageTitle || 'Current note',
      });
    }

    actions.push({
      id: 'go-home',
      title: 'Go to Dashboard',
      icon: <HomeIcon className="w-4 h-4" />,
      action: () => {
        router.push('/');
        onClose();
      },
      category: 'navigation',
    });

    return actions;
  };

  // Search logic with debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        // Show actions + recent pages when no query
        const actions = getStaticActions();
        const recent: CommandItem[] = recentPages.map(page => ({
          id: `recent-${page._id}`,
          title: page.title || 'Untitled',
          subtitle: (page.sectionId as unknown as Record<string, string>)?.name || '',
          icon: <ClockIcon className="w-4 h-4" />,
          action: () => {
            onSelectTask(page);
            onClose();
          },
          category: 'recent',
        }));
        setResults([...actions, ...recent]);
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
          icon:
            (item as any).type === 'section' ? (
              <FolderIcon className="w-4 h-4" />
            ) : (
              <DocumentTextIcon className="w-4 h-4" />
            ),
          action: () => {
            onSelectTask(item);
            onClose();
          },
          category: 'result',
        }));

        // Filter static actions by query too
        const filteredActions = getStaticActions().filter(action =>
          action.title.toLowerCase().includes(query.toLowerCase()),
        );

        setResults([...filteredActions, ...mappedResults]);
      } catch (error) {
        console.error('Search failed', error);
      } finally {
        setLoading(false);
        setSelectedIndex(0);
      }
    }, 150);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, recentPages]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setAiSummary(null);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({block: 'nearest', behavior: 'smooth'});
      }
    }
  }, [selectedIndex]);

  // Keyboard Navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        results[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Group results by category
  const groupedResults = results.reduce(
    (acc, item) => {
      const key = item.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, CommandItem[]>,
  );

  const categoryLabels: Record<string, string> = {
    ai: 'AI Actions',
    action: 'Quick Actions',
    navigation: 'Navigation',
    recent: 'Recent Pages',
    result: 'Search Results',
  };

  const categoryOrder = ['ai', 'action', 'navigation', 'recent', 'result'];

  // Flatten for index tracking
  let flatIndex = -1;

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
          leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6 md:p-20">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95 translate-y-4"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95">
            <Dialog.Panel className="mx-auto max-w-xl transform overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 transition-all">
              {/* Search Input */}
              <div className="relative border-b border-gray-100">
                <MagnifyingGlassIcon
                  className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  ref={inputRef}
                  type="text"
                  className="h-12 w-full border-0 bg-transparent pl-12 pr-4 text-[14px] text-gray-900 placeholder:text-gray-400 focus:ring-0 focus:outline-none"
                  placeholder="Search notes, actions, or type a command..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                {loading && (
                  <div className="absolute right-4 top-3.5">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
                  </div>
                )}
              </div>

              {/* AI Summary Result */}
              {(aiSummary || isSummarizing) && (
                <div className="border-b border-gray-100 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <SparklesIcon className="h-4 w-4 text-violet-500" />
                    <span className="text-xs font-semibold text-violet-600 uppercase tracking-wider">AI Summary</span>
                  </div>
                  {isSummarizing ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-200 border-t-violet-500" />
                      Analyzing note...
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
                  )}
                </div>
              )}

              {/* Results List */}
              {results.length > 0 && (
                <ul ref={listRef} className="max-h-[50vh] overflow-y-auto py-1">
                  {categoryOrder.map(catKey => {
                    const items = groupedResults[catKey];
                    if (!items || items.length === 0) return null;

                    return (
                      <div key={catKey}>
                        <div className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                          {categoryLabels[catKey]}
                        </div>
                        {items.map(item => {
                          flatIndex++;
                          const currentIndex = flatIndex;
                          const isSelected = selectedIndex === currentIndex;

                          return (
                            <li
                              key={item.id}
                              className={`cursor-default select-none mx-2 px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors duration-75 ${
                                isSelected ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
                              }`}
                              onClick={() => item.action()}
                              onMouseEnter={() => setSelectedIndex(currentIndex)}>
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`flex-shrink-0 p-1 rounded-md ${
                                    isSelected ? 'text-white' : 'text-gray-400'
                                  }`}>
                                  {item.icon}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span
                                    className={`text-[13px] font-medium truncate ${
                                      isSelected ? 'text-white' : 'text-gray-800'
                                    }`}>
                                    {item.title}
                                  </span>
                                  {item.subtitle && (
                                    <span
                                      className={`text-[11px] truncate ${
                                        isSelected ? 'text-gray-300' : 'text-gray-400'
                                      }`}>
                                      {item.subtitle}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {item.shortcut && (
                                <kbd
                                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                    isSelected ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-400'
                                  }`}>
                                  {item.shortcut}
                                </kbd>
                              )}
                            </li>
                          );
                        })}
                      </div>
                    );
                  })}
                </ul>
              )}

              {/* Empty State */}
              {query !== '' && results.length === 0 && !loading && (
                <div className="py-12 text-center">
                  <CommandLineIcon className="mx-auto h-8 w-8 text-gray-200" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium text-gray-500">No results found</p>
                  <p className="mt-1 text-xs text-gray-400">Try a different search term</p>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2">
                <div className="flex items-center gap-3 text-[10px] text-gray-300">
                  <span className="flex items-center gap-1">
                    <kbd className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-400">↑↓</kbd> navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-400">↵</kbd> select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-400">esc</kbd> close
                  </span>
                </div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default CommandPalette;
