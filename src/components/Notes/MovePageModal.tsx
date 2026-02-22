import {Dialog} from '@headlessui/react';
import {FolderArrowDownIcon, XMarkIcon} from '@heroicons/react/24/outline';
import axios from 'axios';
import React, {useEffect, useState} from 'react';

import {INoteCategory} from '@/models/NoteCategory';
import {INoteSection} from '@/models/NoteSection';

interface MovePageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (pageId: string, destSectionId: string) => void;
  categories: INoteCategory[];
  pageId: string;
  currentSectionId: string;
}

export const MovePageModal: React.FC<MovePageModalProps> = ({
  isOpen,
  onClose,
  onMove,
  categories,
  pageId,
  currentSectionId,
}) => {
  const [sections, setSections] = useState<INoteSection[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      // Find the category of the current section
      const fetchAllSections = async () => {
        setLoading(true);
        try {
          const res = await axios.get('/api/notes/sections');
          if (res.data.success) {
            const allSections = res.data.data;
            setSections(allSections);

            const currentSec = allSections.find((s: INoteSection) => (s._id as string) === currentSectionId);
            if (currentSec?.categoryId) {
              setSelectedCategory((currentSec.categoryId as any)._id || (currentSec.categoryId as string));
              setSelectedSection('');
            }
          }
        } catch (error) {
          console.error('Failed to fetch sections:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchAllSections();
    }
  }, [isOpen, currentSectionId]);

  const filteredSections = sections.filter(s => {
    const catId = (s.categoryId as any)._id || s.categoryId;
    return catId === selectedCategory;
  });

  const handleMove = () => {
    if (selectedSection && selectedSection !== currentSectionId) {
      onMove(pageId, selectedSection);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[100]">
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-sm w-full rounded-2xl bg-white p-6 shadow-xl border border-black/[0.04]">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <FolderArrowDownIcon className="h-5 w-5 text-indigo-500" />
              Move Page
            </Dialog.Title>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-md p-1 transition-colors">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center text-xs text-gray-500">Loading notebooks...</div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                  Target Notebook
                </label>
                <select
                  value={selectedCategory}
                  onChange={e => {
                    setSelectedCategory(e.target.value);
                    setSelectedSection('');
                  }}
                  className="w-full text-sm rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm transition-all cursor-pointer">
                  <option value="" disabled>
                    Select a Notebook
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
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                    Target Section
                  </label>
                  <select
                    value={selectedSection}
                    onChange={e => setSelectedSection(e.target.value)}
                    className="w-full text-sm rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm transition-all cursor-pointer">
                    <option value="" disabled>
                      Select a Section
                    </option>
                    {filteredSections.map(sec => (
                      <option
                        key={sec._id as string}
                        value={sec._id as string}
                        disabled={(sec._id as string) === currentSectionId}>
                        {sec.name} {(sec._id as string) === currentSectionId ? '(Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleMove}
                  disabled={!selectedSection || selectedSection === currentSectionId}
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-lg shadow-sm transition-all">
                  Move Page
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
