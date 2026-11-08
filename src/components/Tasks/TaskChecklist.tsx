/* eslint-disable react-memo/require-memo, react-memo/require-usememo, react/jsx-sort-props */
'use client';

import {Check, Plus, Trash2} from 'lucide-react';
import React, {useEffect, useState} from 'react';

import {api} from './api';
import {Subtask, Task} from './types';

/** A task's checklist, opened under its row: tick, rename, delete and add steps. Saves as you go. */
export default function TaskChecklist({task}: {task: Task}) {
  const [items, setItems] = useState<Subtask[]>(task.subtasks || []);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setItems(task.subtasks || []), [task.subtasks]);

  // The list updates first, then saves; a failed save puts it back
  const save = (next: Subtask[]) => {
    const before = items;
    setItems(next);
    setError(null);
    api.update(task._id, {subtasks: next}).catch(() => {
      setItems(before);
      setError('Not saved. Try again.');
    });
  };
  const add = () => {
    const title = draft.trim();
    if (!title) return;
    setDraft('');
    save([...items, {title, isCompleted: false}]);
  };
  const done = items.filter(i => i.isCompleted).length;

  return (
    <div className="border-b border-slate-100 bg-[#fafbf7] py-2 pl-[54px] pr-4 last:border-b-0" onClick={e => e.stopPropagation()}>
      {items.length > 0 && (
        <div className="mb-1.5 flex items-center gap-2 text-[11px] text-slate-400">
          <span className="h-1 w-24 overflow-hidden rounded-full bg-slate-200">
            <span className="block h-full rounded-full bg-emerald-500 transition-all" style={{width: `${Math.round((done / items.length) * 100)}%`}} />
          </span>
          {done}/{items.length} done
        </div>
      )}
      <ul className="space-y-0.5">
        {items.map((item, i) => (
          <li className="group/item flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-white" key={item._id || `${i}-${item.title}`}>
            <button
              aria-label={`${item.isCompleted ? 'Not done' : 'Done'}: ${item.title}`}
              aria-pressed={item.isCompleted}
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-[1.5px] transition ${item.isCompleted ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-500'}`}
              onClick={() => save(items.map((x, j) => (j === i ? {...x, isCompleted: !x.isCompleted} : x)))}
              type="button">
              <Check className="h-3 w-3" strokeWidth={3} />
            </button>
            <input
              aria-label={`Checklist item ${i + 1}`}
              className={`min-w-0 flex-1 rounded border-0 bg-transparent px-1 py-0.5 text-[12.5px] outline-none focus:bg-white focus:ring-1 focus:ring-[#cfe0c2] ${item.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}
              defaultValue={item.title}
              key={item.title}
              maxLength={300}
              onBlur={e => {
                const title = e.target.value.trim();
                if (!title) e.target.value = item.title;
                else if (title !== item.title) save(items.map((x, j) => (j === i ? {...x, title} : x)));
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') {
                  e.currentTarget.value = item.title;
                  e.currentTarget.blur();
                }
              }}
            />
            <button
              aria-label={`Delete ${item.title}`}
              className="rounded p-1 text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 focus:opacity-100 group-hover/item:opacity-100"
              onClick={() => save(items.filter((_, j) => j !== i))}
              title="Delete this item"
              type="button">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-1 flex items-center gap-2 px-1"
        onSubmit={e => {
          e.preventDefault();
          add();
        }}>
        <Plus className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <input
          aria-label={`Add a checklist item to ${task.title}`}
          className="min-w-0 flex-1 border-0 bg-transparent py-0.5 text-[12.5px] outline-none placeholder:text-slate-400"
          maxLength={300}
          onChange={e => setDraft(e.target.value)}
          placeholder={items.length ? 'Add another item, press Enter' : 'Add a checklist item, press Enter'}
          value={draft}
        />
      </form>
      {error && <p className="mt-1 px-1 text-[11.5px] text-rose-600">{error}</p>}
    </div>
  );
}
