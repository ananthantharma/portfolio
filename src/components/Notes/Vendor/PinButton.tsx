/* eslint-disable react-memo/require-usememo, react-memo/require-memo, react/jsx-sort-props */
'use client';

import {Pin} from 'lucide-react';
import React from 'react';

import styles from './VendorPage.module.css';

/** Pinned / not pinned toggle; pinned items show on the project overview. */
export default function PinButton({pinned, label, onToggle}: {pinned: boolean; label: string; onToggle: () => void}) {
  return (
    <button
      aria-label={`${pinned ? 'Unpin' : 'Pin'} ${label}`}
      aria-pressed={pinned}
      className={`${styles.iconBtn} ${styles.pinButton}`}
      data-on={pinned}
      onClick={e => {
        e.stopPropagation();
        onToggle();
      }}
      title={pinned ? 'Pinned. Click to unpin.' : 'Pin to keep it on the overview'}
      type="button">
      <Pin size={14} />
    </button>
  );
}
