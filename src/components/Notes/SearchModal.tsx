import {Dialog, Transition} from '@headlessui/react';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  DocumentTextIcon,
  FolderIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import React, {Fragment, useEffect, useState, useRef, useCallback} from 'react';

import {INotePage} from '@/models/NotePage';

interface SearchModalProps {
  fetchItems: (query: string, searchPageTitlesOnly: boolean, searchSectionNamesOnly: boolean) => Promise<INotePage[]>;
  isOpen: boolean;
  onClose: () => void;
  onSelectTask: (task: INotePage) => void;
}

const SearchModal: React.FC<SearchModalProps> = React.memo(({fetchItems, isOpen, onClose, onSelectTask}) => {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<INotePage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0); // For keyboard navigation
  const [searchPageTitlesOnly, setSearchPageTitlesOnly] = useState(false);
  const [searchSectionNamesOnly, setSearchSectionNamesOnly] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim()) {
        setLoading(true);
        try {
          // Reset selection on new search
          setSelectedIndex(0);
          const data = await fetchItems(query, searchPageTitlesOnly, searchSectionNamesOnly);
          setItems(data || []);
        } catch (error) {
          console.error('Search failed', error);
          setItems([]);
        } finally {
          setLoading(false);
        }
      } else {
        setItems([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, fetchItems, searchPageTitlesOnly, searchSectionNamesOnly]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setItems([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard Navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < items.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[selectedIndex]) {
          onSelectTask(items[selectedIndex]);
          onClose();
        }
      }
    },
    [items, selectedIndex, onSelectTask, onClose],
  );

  // Render Item ItemIcon
  const renderItemIcon = (item: INotePage) => {
    // Check if it's a section/folder result
    if ((item as any).type === 'section') {
      return <FolderIcon className="h-5 w-5 text-gray-400" />;
    }
    return <DocumentTextIcon className="h-5 w-5 text-gray-400" />;
  };

  return (
    <Transition appear as={Fragment} show={isOpen}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6 md:p-20">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95">
            <Dialog.Panel className="mx-auto max-w-2xl transform divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5 transition-all">
              <div className="relative">
                <MagnifyingGlassIcon
                  className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  ref={inputRef}
                  className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
                  placeholder="Search notes, sections, or content..."
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  value={query}
                />
              </div>

              {/* Filters (Optional - keeping simplified for now, can add back if needed) */}
              <div className="flex gap-4 px-4 py-2 bg-gray-50/50 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <input
                    checked={searchPageTitlesOnly}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    id="searchPageTitlesOnly"
                    onChange={e => setSearchPageTitlesOnly(e.target.checked)}
                    type="checkbox"
                  />
                  <label
                    className="text-xs text-gray-500 select-none cursor-pointer font-medium"
                    htmlFor="searchPageTitlesOnly">
                    Titles
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    checked={searchSectionNamesOnly}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    id="searchSectionNamesOnly"
                    onChange={e => setSearchSectionNamesOnly(e.target.checked)}
                    type="checkbox"
                  />
                  <label
                    className="text-xs text-gray-500 select-none cursor-pointer font-medium"
                    htmlFor="searchSectionNamesOnly">
                    Section Names
                  </label>
                </div>
              </div>

              {query === '' && items.length === 0 && (
                <div className="py-14 text-center text-sm sm:px-14">
                  <FolderIcon className="mx-auto h-6 w-6 text-gray-300" aria-hidden="true" />
                  <p className="mt-4 font-semibold text-gray-900">Search your second brain</p>
                  <p className="mt-2 text-gray-500">Quickly access pages, sections, and notebooks.</p>
                </div>
              )}

              {items.length > 0 && (
                <ul className="max-h-[60vh] scroll-py-2 overflow-y-auto py-2 text-sm text-gray-800">
                  {items.map((item, index) => (
                    <li
                      key={item._id}
                      className={`cursor-default select-none px-4 py-2 group ${
                        selectedIndex === index ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100'
                      }`}
                      onClick={() => {
                        onSelectTask(item);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex items-center justify-center h-8 w-8 rounded-lg ${
                              selectedIndex === index ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'
                            }`}>
                            {renderItemIcon(item)}
                          </div>
                          <div className="flex flex-col">
                            <span
                              className={`font-semibold ${selectedIndex === index ? 'text-white' : 'text-gray-900'}`}>
                              {item.title || 'Untitled'}
                            </span>
                            <span
                              className={`text-xs ${selectedIndex === index ? 'text-indigo-200' : 'text-gray-500'}`}>
                              {(item.sectionId as any)?.name ? (item.sectionId as any).name : 'Unfiled'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-xs ${selectedIndex === index ? 'text-indigo-200' : 'text-gray-400'}`}>
                            {new Date(item.updatedAt).toLocaleDateString()}
                          </span>
                          {selectedIndex === index && <ArrowRightIcon className="h-4 w-4 text-white" />}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {query !== '' && items.length === 0 && !loading && (
                <div className="py-14 text-center text-sm sm:px-14">
                  <XMarkIcon className="mx-auto h-6 w-6 text-gray-300" aria-hidden="true" />
                  <p className="mt-4 font-semibold text-gray-900">No results found</p>
                  <p className="mt-2 text-gray-500">We couldn’t find anything with that term. Please try again.</p>
                </div>
              )}

              {loading && (
                <div className="py-14 text-center text-sm sm:px-14">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                  <p className="mt-4 text-gray-500">Searching...</p>
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
});

SearchModal.displayName = 'SearchModal';

export default SearchModal;
