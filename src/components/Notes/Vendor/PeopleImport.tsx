/* eslint-disable react-memo/require-usememo, react-memo/require-memo, react/jsx-sort-props */
'use client';

import axios from 'axios';
import React, {useState} from 'react';

import {INoteSection} from '@/models/NoteSection';

import {reloadStaffList, useStaffList} from '../../Tasks/TaskExtras';
import p from './PersonPage.module.css';

/** On a People notebook: turn the people you've assigned work to into person pages, in one go. */
export default function PeopleImport({categoryId, existingNames, onAdded}: {categoryId: string; existingNames: string[]; onAdded: (sections: INoteSection[]) => void}) {
  const staff = useStaffList();
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<Set<string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const taken = new Set(existingNames.map(n => n.trim().toLowerCase()));
  const candidates = (staff || []).filter(s => !s.sectionId && !taken.has(s.name.trim().toLowerCase()));
  if (!candidates.length) return null;
  const selected = chosen || new Set(candidates.map(c => c._id));

  if (!open) {
    return (
      <div className={p.importPanel}>
        <h3>Bring in the people you assign work to</h3>
        <p>
          {candidates.length} {candidates.length === 1 ? 'person you’ve' : 'people you’ve'} assigned tasks to {candidates.length === 1 ? 'doesn’t' : 'don’t'} have a page yet. Their tasks
          show up on their page once it’s added.
        </p>
        <div className={p.importActions}>
          <button onClick={() => setOpen(true)} type="button">
            Choose people
          </button>
        </div>
      </div>
    );
  }

  const add = async () => {
    setSaving(true);
    setError('');
    const added: INoteSection[] = [];
    try {
      for (const person of candidates.filter(c => selected.has(c._id))) {
        const response = await axios.post('/api/notes/sections', {name: person.name.slice(0, 60), categoryId});
        added.push(response.data.data);
      }
      setOpen(false);
      setChosen(null);
    } catch {
      setError('Some people could not be added. Try again.');
    } finally {
      // The staff list links each new page to the person (by name), so their tasks follow
      if (added.length) {
        onAdded(added);
        await reloadStaffList();
      }
      setSaving(false);
    }
  };

  return (
    <div className={p.importPanel}>
      <h3>Add people you assign work to</h3>
      <p>Each one gets a person page. Tasks already assigned to them appear there.</p>
      <div className={p.importList}>
        {candidates.map(c => (
          <label className={p.importItem} key={c._id}>
            <input
              checked={selected.has(c._id)}
              onChange={e => {
                const next = new Set(selected);
                if (e.target.checked) next.add(c._id);
                else next.delete(c._id);
                setChosen(next);
              }}
              type="checkbox"
            />
            {c.name}
            {c.role && <small style={{color: '#8b9384'}}>{c.role}</small>}
          </label>
        ))}
      </div>
      {error && <p style={{color: '#9a3e2c'}}>{error}</p>}
      <div className={p.importActions}>
        <button disabled={saving || !selected.size} onClick={() => void add()} type="button">
          {saving ? 'Adding…' : `Add ${selected.size} ${selected.size === 1 ? 'person' : 'people'}`}
        </button>
        <button onClick={() => setOpen(false)} type="button">
          Cancel
        </button>
      </div>
    </div>
  );
}
