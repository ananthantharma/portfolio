'use client';

import {createContext} from 'react';

// Lets task details open a full note in the surrounding workspace.
export const OpenWorkspaceNoteContext = createContext<((pageId: string) => void) | null>(null);
