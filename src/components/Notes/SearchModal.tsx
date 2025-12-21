import { Dialog, Transition } from '@headlessui/react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import React, { Fragment, useEffect, useState } from 'react';

import { INotePage } from '@/models/NotePage';

interface SearchModalProps {
  fetchItems: (query: string, searchPageTitlesOnly: boolean, searchSectionNamesOnly: boolean) => Promise<INotePage[]>;
  isOpen: boolean;
  onClose: () => void;
  onSelectTask: (task: INotePage) => void;
}

const SearchModal: React.FC<SearchModalProps> = React.memo(({ fetchItems, isOpen, onClose, onSelectTask }) => {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<INotePage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPageTitlesOnly, setSearchPageTitlesOnly] = useState(false);
  const [searchSectionNamesOnly, setSearchSectionNamesOnly] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim()) {
        setLoading(true);
        try {
          const data = await fetchItems(query, searchPageTitlesOnly, searchSectionNamesOnly);
          setItems(data);
        } catch (error) {
          console.error('Search failed', error);
        } finally {
          setLoading(false);
        }
      } else {
        setItems([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, fetchItems, searchPageTitlesOnly, searchSectionNamesOnly]);

  // Reset on open/close
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setItems([]);
      setSearchPageTitlesOnly(false);
      setSearchSectionNamesOnly(false);
    }
  }, [isOpen]);

  return (
    <Transition appear as={Fragment} show={isOpen}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="mt-12 w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex flex-col gap-2 border-b border-gray-200 pb-4">
                  <div className="flex items-center gap-2">
                    <MagnifyingGlassIcon className="h-6 w-6 text-gray-400" />
                    <input
                      autoFocus
                      className="flex-1 border-none px-2 py-1 text-lg text-gray-900 placeholder-gray-400 focus:ring-0"
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Search notes..."
                      type="text"
                      value={query}
                    />
                    <button className="text-gray-400 hover:text-gray-500" onClick={onClose}>
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                  <div className="flex gap-4 px-2">
                    <div className="flex items-center gap-2">
                      <input
                        checked={searchPageTitlesOnly}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        id="searchPageTitlesOnly"
                        onChange={e => setSearchPageTitlesOnly(e.target.checked)}
                        type="checkbox"
                      />
                      <label className="text-sm text-gray-500 select-none cursor-pointer" htmlFor="searchPageTitlesOnly">
                        Search Page Titles Only
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        checked={searchSectionNamesOnly}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        id="searchSectionNamesOnly"
                        onChange={e => setSearchSectionNamesOnly(e.target.checked)}
                        type="checkbox"
                      />
                      <label className="text-sm text-gray-500 select-none cursor-pointer" htmlFor="searchSectionNamesOnly">
                        Search Section Names Only
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-4 max-h-[60vh] overflow-y-auto">
                  {loading ? (
                    <div className="py-8 text-center text-gray-500">Searching...</div>
                  ) : query && items.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">No results found for "{query}"</div>
                  ) : !query ? (
                    <div className="py-8 text-center text-gray-400">Type to search across all notebooks</div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {items.map(item => (
                        <li
                          className="cursor-pointer rounded-md p-3 transition-colors hover:bg-gray-50"
                          key={item._id}
                          onClick={() => onSelectTask(item)}>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{item.title}</p>
                              <p className="text-xs text-gray-500">
                                {(item.sectionId as unknown as { name: string })?.name
                                  ? `${(item.sectionId as unknown as { name: string }).name}`
                                  : 'Unknown Section'}
                              </p>
                            </div>
                            <span className="text-xs text-gray-400">
                              {new Date(item.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
});

SearchModal.displayName = 'SearchModal';

export default SearchModal;
