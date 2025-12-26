import {ChevronRightIcon} from '@heroicons/react/24/outline';
import React, {useState} from 'react';

import {BUDGET_CATEGORIES, getCategoryEmoji, INCOME_CATEGORIES} from '@/lib/categories';

interface CategoryPickerProps {
  currentCategory: string;
  onSelect: (category: string) => void;
  onClose: () => void;
}

export const CategoryPicker: React.FC<CategoryPickerProps> = React.memo(({currentCategory, onSelect, onClose}) => {
  const [selectedParent, setSelectedParent] = useState<string | null>(null);

  // Combine Budget and Income for top-level iteration
  const mainCategories = [
    ...Object.keys(BUDGET_CATEGORIES),
    'Income', // Special case for Income array
  ];

  const getSubcategories = (parent: string) => {
    if (parent === 'Income') return INCOME_CATEGORIES;
    return BUDGET_CATEGORIES[parent as keyof typeof BUDGET_CATEGORIES] || [];
  };

  return (
    <div className="absolute top-full left-0 mt-2 z-50 w-72 rounded-xl bg-white shadow-xl ring-1 ring-black/5 p-2 flex gap-1">
      {/* Main Categories Column */}
      <div className="w-1/3 border-r border-gray-100 flex flex-col gap-1 max-h-64 overflow-y-auto custom-scrollbar">
        {mainCategories.map(parent => (
          <button
            className={`flex w-full items-center justify-between rounded-lg p-2 text-xs transition-colors ${
              selectedParent === parent ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
            }`}
            key={parent}
            onClick={e => {
              e.stopPropagation();
              setSelectedParent(parent);
            }}>
            <span className="truncate">{getCategoryEmoji(parent)}</span>
            <ChevronRightIcon className="h-3 w-3 opacity-50" />
          </button>
        ))}
      </div>

      {/* Subcategories Column */}
      <div className="flex-1 flex flex-col gap-1 max-h-64 overflow-y-auto custom-scrollbar p-1">
        {selectedParent ? (
          <>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 px-2">{selectedParent}</h4>
            {getSubcategories(selectedParent).map(sub => (
              <button
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-left transition-colors ${
                  currentCategory === sub ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                }`}
                key={sub}
                onClick={e => {
                  e.stopPropagation();
                  onSelect(sub);
                  onClose();
                }}>
                <span>{getCategoryEmoji(sub)}</span>
                <span className="truncate">{sub}</span>
              </button>
            ))}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-400 text-center px-4">
            Select a category group to see options
          </div>
        )}
      </div>

      {/* Close Overlay (Screen Takeover for outside click usually handled by parent, but basic dismissal here if needed) */}
    </div>
  );
});

CategoryPicker.displayName = 'CategoryPicker';
