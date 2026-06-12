import {Dialog} from '@headlessui/react';
import {CheckIcon, FolderArrowDownIcon, FolderIcon, InboxIcon, XMarkIcon} from '@heroicons/react/24/outline';
import axios from 'axios';
import React, {useEffect, useMemo, useState} from 'react';

import {INoteCategory} from '@/models/NoteCategory';
import {INoteSection} from '@/models/NoteSection';

/** Destination for a page move: a section, or a category root (sectionId === null). */
export interface MoveDestination {
  sectionId: string | null;
  categoryId: string;
}

interface MovePageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (pageId: string, dest: MoveDestination) => void;
  categories: INoteCategory[];
  pageId: string;
  pageTitle?: string;
  /** Current location — null sectionId means the page lives at the category root */
  currentSectionId: string | null;
  currentCategoryId?: string | null;
}

const ROOT = '__root__';

export const MovePageModal: React.FC<MovePageModalProps> = ({
  isOpen,
  onClose,
  onMove,
  categories,
  pageId,
  pageTitle,
  currentSectionId,
  currentCategoryId,
}) => {
  const [sections, setSections] = useState<INoteSection[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTarget, setSelectedTarget] = useState<string>(''); // section id or ROOT

  useEffect(() => {
    if (!isOpen) return;
    const fetchAllSections = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/notes/sections');
        if (res.data.success) {
          const allSections = res.data.data;
          setSections(allSections);

          // Pre-select the page's current category
          if (currentSectionId) {
            const currentSec = allSections.find((s: INoteSection) => (s._id as string) === currentSectionId);
            if (currentSec?.categoryId) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              setSelectedCategory((currentSec.categoryId as any)._id || (currentSec.categoryId as string));
            }
          } else if (currentCategoryId) {
            setSelectedCategory(currentCategoryId);
          }
          setSelectedTarget('');
        }
      } catch (error) {
        console.error('Failed to fetch sections:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllSections();
  }, [isOpen, currentSectionId, currentCategoryId]);

  const filteredSections = useMemo(
    () =>
      sections.filter(s => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const catId = (s.categoryId as any)?._id || s.categoryId;
        return catId === selectedCategory;
      }),
    [sections, selectedCategory],
  );

  const isCurrentLocation = (target: string) => {
    if (target === ROOT) return !currentSectionId && selectedCategory === currentCategoryId;
    return target === currentSectionId;
  };

  const canMove = !!selectedCategory && !!selectedTarget && !isCurrentLocation(selectedTarget);

  const handleMove = () => {
    if (!canMove) return;
    onMove(pageId, {
      sectionId: selectedTarget === ROOT ? null : selectedTarget,
      categoryId: selectedCategory,
    });
  };

  return (
    <Dialog className="relative z-[100]" onClose={onClose} open={isOpen}>
      <div aria-hidden="true" className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/[0.06]">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <Dialog.Title className="flex items-center gap-2 text-[14px] font-semibold text-slate-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50">
                  <FolderArrowDownIcon className="h-4 w-4 text-indigo-600" />
                </span>
                Move page
              </Dialog.Title>
              {pageTitle && <p className="mt-1 truncate text-[11px] text-slate-400 max-w-[240px]">“{pageTitle}”</p>}
            </div>
            <button className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" onClick={onClose}>
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col gap-2 py-2">
              {[1, 2, 3].map(i => (
                <div className="h-8 animate-pulse rounded-lg bg-slate-100" key={i} />
              ))}
            </div>
          ) : (
            <div className="space-y-3.5">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Notebook
                </label>
                <select
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-900 shadow-sm transition-all focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  onChange={e => {
                    setSelectedCategory(e.target.value);
                    setSelectedTarget('');
                  }}
                  value={selectedCategory}>
                  <option disabled value="">
                    Select a notebook
                  </option>
                  {categories.map(cat => (
                    <option key={cat._id as string} value={cat._id as string}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCategory && (
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Destination
                  </label>
                  <ul className="max-h-52 space-y-1 overflow-y-auto pr-0.5">
                    {/* Category root option */}
                    <li>
                      <button
                        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] transition-colors ${
                          selectedTarget === ROOT
                            ? 'bg-indigo-50 font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200'
                            : 'text-slate-600 hover:bg-slate-50'
                        } ${isCurrentLocation(ROOT) ? 'cursor-not-allowed opacity-45' : ''}`}
                        disabled={isCurrentLocation(ROOT)}
                        onClick={() => setSelectedTarget(ROOT)}>
                        <InboxIcon className="h-3.5 w-3.5 flex-shrink-0 text-indigo-500" />
                        <span className="flex-1 truncate">
                          Notebook root <span className="text-slate-400">(no section)</span>
                          {isCurrentLocation(ROOT) ? ' — current' : ''}
                        </span>
                        {selectedTarget === ROOT && <CheckIcon className="h-3.5 w-3.5 flex-shrink-0" />}
                      </button>
                    </li>
                    {filteredSections.map(sec => {
                      const sid = sec._id as string;
                      const isCurrent = isCurrentLocation(sid);
                      return (
                        <li key={sid}>
                          <button
                            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] transition-colors ${
                              selectedTarget === sid
                                ? 'bg-indigo-50 font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200'
                                : 'text-slate-600 hover:bg-slate-50'
                            } ${isCurrent ? 'cursor-not-allowed opacity-45' : ''}`}
                            disabled={isCurrent}
                            onClick={() => setSelectedTarget(sid)}>
                            <FolderIcon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                            <span className="flex-1 truncate">
                              {sec.name}
                              {isCurrent ? ' — current' : ''}
                            </span>
                            {selectedTarget === sid && <CheckIcon className="h-3.5 w-3.5 flex-shrink-0" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  className="rounded-lg px-3.5 py-2 text-[12px] font-medium text-slate-500 transition-colors hover:bg-slate-100"
                  onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="rounded-lg bg-indigo-600 px-3.5 py-2 text-[12px] font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600"
                  disabled={!canMove}
                  onClick={handleMove}>
                  Move page
                </button>
              </div>
            </div>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default MovePageModal;
