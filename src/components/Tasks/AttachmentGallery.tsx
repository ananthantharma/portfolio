/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {ExternalLink, ImagePlus, Paperclip, X} from 'lucide-react';
import React, {useState} from 'react';

import {Attachment} from './types';

interface AttachmentGalleryProps {
  attachments: Attachment[];
  onRemove?: (index: number) => void;
  compact?: boolean;
}

function isImage(att: Attachment): boolean {
  return att.type.startsWith('image/') && !!(att.data || att.webViewLink);
}

/** Opens an image in a real new browser tab/window. `data:` URLs are converted to a
 * blob URL first — Chrome blocks top-level navigation straight to a data: URL. */
async function openImageInNewWindow(src: string) {
  if (!src.startsWith('data:')) {
    window.open(src, '_blank', 'noopener,noreferrer');
    return;
  }
  const blob = await (await fetch(src)).blob();
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

/** Shared image/file attachment view — used by both the sidebar drawer and the large task window. */
export default function AttachmentGallery({attachments, onRemove, compact}: AttachmentGalleryProps) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (attachments.length === 0) return null;

  const images = attachments.filter(isImage);
  const files = attachments.filter(a => !isImage(a));

  return (
    <>
      {images.length > 0 && (
        <div className={`grid gap-2 ${compact ? 'grid-cols-3' : 'grid-cols-4'}`}>
          {images.map((att, i) => {
            const idx = attachments.indexOf(att);
            const src = att.data || att.webViewLink || '';
            return (
              <div className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700" key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={att.name}
                  className="h-full w-full cursor-zoom-in object-cover"
                  onClick={() => setLightbox(src)}
                  src={src}
                />
                <div className="absolute right-1 top-1 hidden gap-1 group-hover:flex">
                  <button
                    className="rounded-full bg-black/60 p-1 text-white"
                    onClick={e => {
                      e.stopPropagation();
                      openImageInNewWindow(src);
                    }}
                    title="Open in new browser window">
                    <ExternalLink className="h-3 w-3" />
                  </button>
                  {onRemove && (
                    <button
                      className="rounded-full bg-black/60 p-1 text-white"
                      onClick={e => {
                        e.stopPropagation();
                        onRemove(idx);
                      }}
                      title="Remove image">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {files.length > 0 && (
        <div className={`space-y-1.5 ${images.length > 0 ? 'mt-2' : ''}`}>
          {files.map((att, i) => {
            const idx = attachments.indexOf(att);
            return (
              <div
                className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[12px] text-slate-600 dark:bg-slate-700/60 dark:text-slate-300"
                key={i}>
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1 truncate">{att.name}</span>
                {att.webViewLink && (
                  <a className="text-slate-400 hover:text-orange-600" href={att.webViewLink} rel="noreferrer" target="_blank">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                {onRemove && (
                  <button className="text-slate-300 hover:text-rose-500" onClick={() => onRemove(idx)} title="Remove">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[300] flex cursor-zoom-out items-center justify-center bg-black/85 p-8"
          onClick={() => setLightbox(null)}>
          <button
            className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-white/20"
            onClick={e => {
              e.stopPropagation();
              openImageInNewWindow(lightbox);
            }}
            title="Open in new browser window">
            <ExternalLink className="h-3.5 w-3.5" /> Open in new window
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" src={lightbox} />
        </div>
      )}
    </>
  );
}

export function PasteHint({compact}: {compact?: boolean}) {
  if (compact) return null;
  return (
    <p className="flex items-center gap-1.5 text-[10.5px] text-slate-300">
      <ImagePlus className="h-3 w-3" /> Paste an image (Ctrl+V) anywhere in this panel to attach it
    </p>
  );
}
