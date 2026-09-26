'use client';

import {createContext} from 'react';

// Lets task details open a full note in the surrounding workspace.
export const OpenWorkspaceNoteContext = createContext<((pageId: string) => void) | null>(null);

// Lets a task's vendor pill open that vendor's page in the surrounding workspace.
export const OpenVendorContext = createContext<((sectionId: string, notebookId?: string) => void) | null>(null);
