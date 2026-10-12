'use client';

import {getSession} from 'next-auth/react';

export type DriveFileMeta = {id: string; name: string; mimeType?: string; webViewLink?: string};

/**
 * Upload a file to a folder in the signed-in user's Google Drive.
 * Goes through /api/drive/files in 2 MB pieces so each request stays under the hosting body limit.
 */
export async function uploadToDrive(file: File, folderName: string, onProgress?: (fraction: number) => void): Promise<DriveFileMeta> {
  const initRes = await fetch('/api/drive/files', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({action: 'initiate', name: file.name, type: file.type, folderName, size: file.size}),
  });
  const initData = await initRes.json().catch(() => ({}));
  if (!initRes.ok) throw new Error(initData.error || 'Could not start the upload to Google Drive');
  const uploadUrl: string | undefined = initData.uploadUrl;
  if (!uploadUrl) throw new Error('Google Drive did not accept the upload');

  const CHUNK = 2 * 1024 * 1024;
  let offset = 0;
  onProgress?.(0);
  // An empty file still needs one (empty) piece to finish the upload
  do {
    const chunk = file.slice(offset, offset + CHUNK);
    const form = new FormData();
    form.append('action', 'upload_chunk');
    form.append('chunk', chunk, 'chunk');
    form.append('uploadUrl', uploadUrl);
    form.append('contentRange', file.size ? `bytes ${offset}-${offset + chunk.size - 1}/${file.size}` : 'bytes */0');
    const res = await fetch('/api/drive/files', {method: 'POST', body: form});
    if (!res.ok) throw new Error(`Upload failed (${res.status}). Try again.`);
    const data = await res.json();
    if (data.status === 308) {
      offset += chunk.size;
      onProgress?.(Math.min(0.99, offset / file.size));
      continue;
    }
    if (data.success && (data.status === 200 || data.status === 201) && data.file) {
      onProgress?.(1);
      return data.file as DriveFileMeta;
    }
    throw new Error('Google Drive returned an unexpected answer');
  } while (offset < file.size);
  throw new Error('Upload finished without a file from Google Drive');
}

/**
 * Download a Drive file straight to the computer (no trip to the Google Drive website).
 * The browser fetches it from the Drive API with the signed-in Google session, then saves it.
 */
export async function downloadFromDrive(file: {id: string; name: string; mimeType?: string}) {
  // A fresh session also refreshes an expired Google token
  const session = (await getSession()) as {accessToken?: string} | null;
  const token = session?.accessToken;
  if (!token) throw new Error('Sign out and back in with Google to download files.');
  const isGoogleDoc = file.mimeType?.startsWith('application/vnd.google-apps');
  const url = isGoogleDoc
    ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/export?mimeType=application%2Fpdf`
    : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`;
  const res = await fetch(url, {headers: {Authorization: `Bearer ${token}`}});
  if (res.status === 404) throw new Error('This file is no longer in your Google Drive.');
  if (!res.ok) throw new Error(`Could not download (${res.status}).`);
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = isGoogleDoc && !/\.pdf$/i.test(file.name) ? `${file.name}.pdf` : file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}
