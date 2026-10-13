'use client';
/* eslint-disable */
import axios from 'axios';
import {SessionProvider} from 'next-auth/react';
import NotesLayout from '@/components/Notes/NotesLayout';

const fakeSession = {user: {email: 'harness@example.test', name: 'Harness', notesEnabled: true}, expires: '2099-01-01T00:00:00.000Z'};
const categories = [{_id: 'c1', name: 'Work', order: 0, kind: 'general', userEmail: 'h'}];
const sections = [{_id: 's1', name: 'Meetings with a fairly long section name', categoryId: 'c1', order: 0}, {_id: 's2', name: 'Vendor reviews', categoryId: 'c1', order: 1}];
axios.defaults.adapter = async (config: any) => {
  const url: string = config.url || '';
  const data = url.startsWith('/api/notes/stats') ? {pages: {}, sections: {}, categories: {}} : url.startsWith('/api/notes/categories') ? categories : url.startsWith('/api/notes/sections') ? sections : [];
  return {data: {success: true, data}, status: 200, statusText: 'OK', headers: {}, config} as any;
};
const w = typeof window !== 'undefined' ? (window as any) : null;
if (w && !w.__mocked) {
  w.__mocked = true;
  const orig = window.fetch.bind(window);
  const json = (b: unknown) => new Response(JSON.stringify(b), {status: 200, headers: {'Content-Type': 'application/json'}});
  window.fetch = async (input: any, init?: any) => {
    const url: string = typeof input === 'string' ? input : input instanceof URL ? input.href : String(input?.url || '');
    if (url.includes('/api/auth/session')) return json(fakeSession);
    if (url.includes('/api/')) return json({success: true, data: []});
    return orig(input, init);
  };
}
export default function Page() {
  return <SessionProvider session={fakeSession as any}><NotesLayout /></SessionProvider>;
}
