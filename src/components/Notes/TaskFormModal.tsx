/* eslint-disable react/jsx-sort-props, react-memo/require-usememo, react-memo/require-memo */
'use client';
import { Dialog, Listbox, Transition } from '@headlessui/react';
import {
  CalendarIcon,
  CheckIcon,
  ChevronUpDownIcon,
  CloudArrowUpIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  MinusCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import React, { Fragment, useEffect, useState } from 'react';

export interface TaskFormData {
  title: string;
  priority: 'High' | 'Medium' | 'Low' | 'None';
  dueDate: Date;
  category: string;
  notes: string;
  attachments?: { name: string; type: string; fileId?: string; size: number }[];
  newFiles?: File[];
  driveAttachments?: {
    name: string;
    type: string;
    webViewLink: string;
    fileId: string;
    storageType: 'drive';
    size: number;
  }[];
  blobAttachments?: {
    name: string;
    type: string;
    webViewLink: string;
    storageType: 'blob';
    size: number;
  }[];
}

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TaskFormData) => void;
  initialData?: Partial<TaskFormData>;
  title?: string;
}

const PRIORITIES = [
  { name: 'High', value: 'High', icon: ExclamationCircleIcon, color: 'text-red-500', bg: 'bg-red-50 border-red-200', activeBg: 'bg-red-500 border-red-500 text-white' },
  { name: 'Medium', value: 'Medium', icon: ExclamationTriangleIcon, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200', activeBg: 'bg-amber-500 border-amber-500 text-white' },
  { name: 'Low', value: 'Low', icon: MinusCircleIcon, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200', activeBg: 'bg-emerald-500 border-emerald-500 text-white' },
  { name: 'None', value: 'None', icon: MinusCircleIcon, color: 'text-gray-400', bg: 'bg-gray-50 border-gray-200', activeBg: 'bg-gray-700 border-gray-700 text-white' },
];

const CATEGORIES = [
  { name: 'Urgent!', value: 'Urgent!', color: 'bg-red-50 text-red-700 border-red-200' },
  { name: 'Sourcing!', value: 'Sourcing!', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { name: 'Boss!', value: 'Boss!', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { name: 'Staff! (Team)', value: 'Staff! (Team)', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { name: 'Projects!', value: 'Projects!', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { name: 'Admin!', value: 'Admin!', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { name: 'Personal!', value: 'Personal!', color: 'bg-teal-50 text-teal-700 border-teal-200' },
];

const TaskFormModal: React.FC<TaskFormModalProps> = React.memo(
  ({ isOpen, onClose, onSave, initialData, title: modalTitle }) => {
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState(PRIORITIES[3]);
    const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<{ name: string; value: string; color: string } | null>(null);
    const [attachments, setAttachments] = useState<
      { name: string; type: string; fileId?: string; size: number; file?: File }[]
    >([]);
    const [dragActive, setDragActive] = useState(false);

    // Storage State
    const [storageType, setStorageType] = useState<'local' | 'drive' | 'blob'>('local');
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
      if (isOpen) {
        setTitle(initialData?.title || '');
        const initPriority = PRIORITIES.find(p => p.value === initialData?.priority) || PRIORITIES[3];
        setPriority(initPriority);
        const initDate = initialData?.dueDate
          ? new Date(initialData.dueDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
        setDueDate(initDate);
        const initCategory = CATEGORIES.find(c => c.value === initialData?.category) || null;
        setSelectedCategory(initCategory);
        setNotes(initialData?.notes || '');
        if (initialData?.attachments) {
          const loadedAttachments = initialData.attachments.map(att => ({
            ...att,
            fileId: att.fileId,
            size: att.size || 0,
          }));
          setAttachments(loadedAttachments);
        } else {
          setAttachments([]);
        }
        if (initialData?.attachments) {
          const loadedAttachments = initialData.attachments.map(att => ({
            ...att,
            fileId: att.fileId,
            size: att.size || 0,
          }));
          setAttachments(loadedAttachments);
        } else {
          setAttachments([]);
        }
        setStorageType('local');
        setIsUploading(false);
      }
    }, [isOpen, initialData]);

    const handleSave = async () => {
      let finalNewFiles: File[] = [];
      const finalDriveAttachments: TaskFormData['driveAttachments'] = [];
      const finalBlobAttachments: TaskFormData['blobAttachments'] = [];

      try {
        const filesToUpload = attachments.map(a => a.file).filter(f => f !== undefined) as File[];

        if (storageType === 'drive' && filesToUpload.length > 0) {
          setIsUploading(true);

          for (const file of filesToUpload) {
            const initRes = await fetch('/api/drive/files', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'initiate',
                name: file.name,
                type: file.type,
                folderName: 'Portfolio Task Attachments',
                size: file.size,
              }),
            });

            const initData = await initRes.json();

            if (!initRes.ok) {
              if (initRes.status === 403 || initData.code === 'DRIVE_ACCESS_DENIED') {
                const detailMsg = initData.error || 'Google Drive Permission Denied';
                throw new Error(`DRIVE_ACCESS_DENIED: ${detailMsg}`);
              }
              throw new Error(initData.error || `Failed to initiate upload for ${file.name}`);
            }

            const uploadUrl = initData.uploadUrl;
            if (!uploadUrl) throw new Error('Failed to get upload URL');

            const CHUNK_SIZE = 2 * 1024 * 1024;
            let offset = 0;
            const fileSize = file.size;

            while (offset < fileSize) {
              const chunk = file.slice(offset, offset + CHUNK_SIZE);
              const contentRange = `bytes ${offset}-${offset + chunk.size - 1}/${fileSize}`;

              const chunkFormData = new FormData();
              chunkFormData.append('action', 'upload_chunk');
              chunkFormData.append('chunk', chunk, 'chunk');
              chunkFormData.append('uploadUrl', uploadUrl);
              chunkFormData.append('contentRange', contentRange);

              const chunkRes = await fetch('/api/drive/files', {
                method: 'POST',
                body: chunkFormData,
              });

              if (!chunkRes.ok) {
                const errData = await chunkRes.json();
                throw new Error(errData.error || `Chunk upload failed at offset ${offset}`);
              }

              const chunkData = await chunkRes.json();

              if (chunkData.status === 308) {
                offset += chunk.size;
              } else if (chunkData.success && (chunkData.status === 200 || chunkData.status === 201)) {
                if (chunkData.file && chunkData.file.id) {
                  finalDriveAttachments.push({
                    name: chunkData.file.name,
                    type: chunkData.file.mimeType || file.type,
                    webViewLink: chunkData.file.webViewLink,
                    fileId: chunkData.file.id,
                    storageType: 'drive',
                    size: file.size,
                  });
                }
                break;
              } else {
                throw new Error('Unexpected upload status from proxy');
              }
            }
          }
        } else if (storageType === 'blob' && filesToUpload.length > 0) {
          setIsUploading(true);

          for (const file of filesToUpload) {
            const response = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
              method: 'POST',
              body: file,
            });

            if (!response.ok) {
              let errMsg = response.statusText;
              try {
                const errData = await response.json();
                if (errData.error) errMsg = errData.error;
              } catch (e) { }
              throw new Error(`Upload failed: ${errMsg}`);
            }

            const newBlob = await response.json();

            finalBlobAttachments.push({
              name: file.name,
              type: file.type,
              webViewLink: newBlob.url,
              storageType: 'blob',
              size: file.size,
            });
          }
        } else {
          finalNewFiles = filesToUpload;
        }

        onSave({
          title,
          priority: priority.value as 'High' | 'Medium' | 'Low' | 'None',
          dueDate: new Date(dueDate),
          category: selectedCategory ? selectedCategory.value : '',
          notes,
          attachments: attachments.filter(a => !a.file),
          newFiles: finalNewFiles,
          driveAttachments: finalDriveAttachments,
          blobAttachments: finalBlobAttachments,
        });
        onClose();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        console.error('Upload Error', error);
        if (
          (error.message && error.message.includes('DRIVE_ACCESS_DENIED')) ||
          error.message.includes('permission denied')
        ) {
          alert(`Upload Failed: ${error.message}`);
        } else {
          alert(`Failed to save: ${error.message}`);
        }
      } finally {
        setIsUploading(false);
      }
    };

    const handleDrag = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === 'dragenter' || e.type === 'dragover') {
        setDragActive(true);
      } else if (e.type === 'dragleave') {
        setDragActive(false);
      }
    };

    const processFiles = (files: FileList) => {
      Array.from(files).forEach(file => {
        if (storageType === 'local' && file.size > 4 * 1024 * 1024) {
          alert(`File ${file.name} is too large. Max 4MB for local storage. Enable Drive or Blob Storage for larger files.`);
          return;
        }
        setAttachments(prev => [...prev, { name: file.name, type: file.type, size: file.size, file }]);
      });
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    };

    const handleChangeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
    };

    const removeAttachment = (index: number) => {
      setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const inputStyle = "block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 transition-colors";
    const labelStyle = "block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

    return (
      <Transition appear={true} as={Fragment} show={isOpen}>
        <Dialog as="div" className="relative z-[60]" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-[0.98] translate-y-2"
                enterTo="opacity-100 scale-100 translate-y-0"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl ring-1 ring-black/5 transition-all">

                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h3 className="text-base font-semibold text-gray-900 tracking-tight">
                      {modalTitle || 'Task Details'}
                    </h3>
                    <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors" onClick={onClose}>
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Task Name */}
                    <div>
                      <label className={labelStyle}>Task Name</label>
                      <input
                        className={inputStyle}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="What needs to be done?"
                        type="text"
                        value={title}
                      />
                    </div>

                    {/* Priority */}
                    <div>
                      <label className={labelStyle}>Priority</label>
                      <div className="flex gap-2">
                        {PRIORITIES.map(p => (
                          <button
                            key={p.name}
                            className={`flex items-center gap-1.5 flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${priority.name === p.name ? p.activeBg : `${p.bg} hover:opacity-80`
                              }`}
                            type="button"
                            onClick={() => setPriority(p)}>
                            <p.icon className={`h-4 w-4 ${priority.name === p.name ? 'text-white' : p.color}`} />
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Due Date + Category row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelStyle}>Due Date</label>
                        <div className="relative">
                          <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            className={`${inputStyle} pl-9`}
                            onChange={e => setDueDate(e.target.value)}
                            type="date"
                            value={dueDate}
                          />
                        </div>
                      </div>

                      <div>
                        <label className={labelStyle}>Category</label>
                        <Listbox onChange={setSelectedCategory} value={selectedCategory}>
                          <div className="relative">
                            <Listbox.Button className={`${inputStyle} text-left pr-10 cursor-default`}>
                              <span className={`block truncate ${!selectedCategory ? 'text-gray-400' : ''}`}>
                                {selectedCategory ? selectedCategory.name : 'Select...'}
                              </span>
                              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
                              </span>
                            </Listbox.Button>
                            <Transition
                              as={Fragment}
                              leave="transition ease-in duration-100"
                              leaveFrom="opacity-100"
                              leaveTo="opacity-0">
                              <Listbox.Options className="absolute mt-1 max-h-48 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none z-10">
                                <Listbox.Option
                                  className={({ active }) =>
                                    `cursor-default select-none py-2 pl-9 pr-4 ${active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`
                                  }
                                  key="none"
                                  value={null}>
                                  {({ selected }) => (
                                    <>
                                      <span className={`block truncate ${selected ? 'font-medium' : ''}`}>None</span>
                                      {selected && (
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-600">
                                          <CheckIcon className="h-4 w-4" />
                                        </span>
                                      )}
                                    </>
                                  )}
                                </Listbox.Option>

                                {CATEGORIES.map((cat, idx) => (
                                  <Listbox.Option
                                    className={({ active }) =>
                                      `cursor-default select-none py-2 pl-9 pr-4 ${active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`
                                    }
                                    key={idx}
                                    value={cat}>
                                    {({ selected }) => (
                                      <>
                                        <span className={`block truncate ${selected ? 'font-medium' : ''}`}>{cat.name}</span>
                                        {selected && (
                                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-600">
                                            <CheckIcon className="h-4 w-4" />
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </Listbox.Option>
                                ))}
                              </Listbox.Options>
                            </Transition>
                          </div>
                        </Listbox>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className={labelStyle}>Notes <span className="font-normal text-gray-300">(Optional)</span></label>
                      <textarea
                        className={`${inputStyle} resize-none`}
                        onChange={e => setNotes(e.target.value)}
                        rows={3}
                        value={notes}
                        placeholder="Add details..."
                      />
                    </div>

                    {/* Attachments */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className={labelStyle + ' mb-0'}>Attachments</label>
                        <div className="flex bg-gray-100 p-0.5 rounded-lg">
                          {(['local', 'drive', 'blob'] as const).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setStorageType(type)}
                              className={`px-3 py-1 text-[10px] font-medium rounded-md transition-all ${storageType === type
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                              {type === 'local' ? 'Local' : type === 'drive' ? 'Drive' : 'Blob'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div
                        className={`relative flex flex-col items-center justify-center w-full h-24 rounded-lg border-2 border-dashed transition-colors ${dragActive ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:bg-gray-50/50'
                          }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}>
                        <input
                          type="file"
                          multiple
                          onChange={handleChangeFile}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center justify-center">
                          {storageType === 'drive' ? (
                            <CloudArrowUpIcon className="h-6 w-6 text-gray-300 mb-1" />
                          ) : storageType === 'blob' ? (
                            <CloudArrowUpIcon className="h-6 w-6 text-indigo-300 mb-1" />
                          ) : null}
                          <p className="text-xs text-gray-400">
                            <span className="font-medium text-gray-500">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-[10px] text-gray-300 mt-0.5">
                            {storageType === 'local' ? 'Max 4MB per file' : 'Uploads to ' + (storageType === 'drive' ? 'Google Drive' : 'Vercel Blob')}
                          </p>
                        </div>
                      </div>

                      {attachments.length > 0 && (
                        <ul className="mt-2 text-xs text-gray-600 space-y-1">
                          {attachments.map((file, idx) => (
                            <li key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                              <span className="truncate max-w-[85%] text-gray-600">{file.name}</span>
                              <button type="button" onClick={() => removeAttachment(idx)} className="text-gray-400 hover:text-red-500 transition-colors">
                                <XMarkIcon className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                    <button
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      type="button"
                      onClick={onClose}>
                      Cancel
                    </button>
                    <button
                      className={`px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors ${isUploading ? 'opacity-70 cursor-wait' : ''
                        }`}
                      type="button"
                      disabled={isUploading}
                      onClick={handleSave}>
                      {isUploading ? 'Uploading...' : 'Save Task'}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    );
  },
);

TaskFormModal.displayName = 'TaskFormModal';
export default TaskFormModal;
