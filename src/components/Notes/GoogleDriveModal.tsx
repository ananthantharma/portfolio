import React, { useState, useEffect } from 'react';
import { X, HardDrive, File, Folder, Download, Trash2, ArrowLeft, Loader2, Plus, Search } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  iconLink?: string;
  webViewLink?: string;
}

const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<{ id: string; name: string }[]>([{ id: 'root', name: 'My Drive' }]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { data: session } = useSession() as any;

  const activeFolder = currentFolder[currentFolder.length - 1];

  useEffect(() => {
    if (isOpen && session?.accessToken) {
      fetchFiles(activeFolder.id);
    }
  }, [isOpen, session, activeFolder.id]);

  async function fetchFiles(folderId: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/drive?folderId=${folderId}`);
      if (!res.ok) throw new Error('Failed to fetch files');
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('parentId', activeFolder.id);

      const res = await fetch('/api/drive', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Upload failed');
      }
      
      await fetchFiles(activeFolder.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  }

  async function handleDelete(fileId: string) {
    if (!confirm('Are you sure you want to delete this?')) return;
    try {
      const res = await fetch(`/api/drive?fileId=${fileId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setFiles(files.filter(f => f.id !== fileId));
    } catch (err: any) {
      setError(err.message);
    }
  }

  function handleFolderClick(file: DriveFile) {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      setCurrentFolder([...currentFolder, { id: file.id, name: file.name }]);
    }
  }

  function goBack() {
    if (currentFolder.length > 1) {
      setCurrentFolder(currentFolder.slice(0, -1));
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-5xl h-full max-h-[85vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shadow-sm">
                <HardDrive className="w-6 h-6 text-emerald-600" />
             </div>
             <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Google Drive</h2>
                <div className="flex items-center gap-2 mt-0.5">
                   {currentFolder.map((f, i) => (
                      <React.Fragment key={f.id}>
                         {i > 0 && <span className="text-gray-300 text-xs text-center mx-1">/</span>}
                         <span className={`text-[11px] font-bold cursor-pointer transition-colors ${i === currentFolder.length - 1 ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                               onClick={() => setCurrentFolder(currentFolder.slice(0, i + 1))}>
                            {f.name}
                         </span>
                      </React.Fragment>
                   ))}
                </div>
             </div>
          </div>
          <div className="flex items-center gap-2">
             <label className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-all shadow-lg shadow-emerald-100 active:scale-95 disabled:opacity-50">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Upload File
                <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
             </label>
             <button onClick={onClose} className="p-2.5 rounded-full hover:bg-gray-100 text-gray-400 transition-all hover:rotate-90">
                <X className="w-6 h-6" />
             </button>
          </div>
        </div>

        {/* Browser Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8">
           {error && (
             <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-medium flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                {error}
             </div>
           )}

           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {currentFolder.length > 1 && !loading && (
                 <div onClick={goBack} className="group relative bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                       <ArrowLeft className="w-6 h-6 text-slate-400 group-hover:text-indigo-500" />
                    </div>
                    <span className="text-xs font-bold text-slate-500 group-hover:text-indigo-600 antialiased">Go Back</span>
                 </div>
              )}

              {loading ? (
                 Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="bg-white/40 p-5 rounded-2xl border border-slate-100 animate-pulse flex flex-col items-center gap-3">
                       <div className="w-12 h-12 bg-slate-200 rounded-xl" />
                       <div className="h-3 w-20 bg-slate-200 rounded-md" />
                    </div>
                 ))
              ) : files.length > 0 ? (
                 files.map(file => (
                   <div key={file.id} 
                        onClick={() => handleFolderClick(file)}
                        className={`group relative bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 cursor-pointer flex flex-col items-center gap-3 pt-8 ${file.mimeType === 'application/vnd.google-apps.folder' ? 'hover:-translate-y-1' : ''}`}>
                      
                      {/* Icon */}
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner relative ${file.mimeType === 'application/vnd.google-apps.folder' ? 'bg-amber-50' : 'bg-slate-50'}`}>
                         {file.mimeType === 'application/vnd.google-apps.folder' ? (
                           <Folder className="w-7 h-7 text-amber-500" />
                         ) : (
                           <File className="w-7 h-7 text-indigo-400" />
                         )}
                      </div>

                      {/* Info */}
                      <div className="text-center w-full px-2">
                         <p className="text-[12px] font-bold text-gray-700 truncate group-hover:text-indigo-600 transition-colors" title={file.name}>{file.name}</p>
                         <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-tighter font-medium">
                            {file.mimeType.includes('folder') ? 'Folder' : file.mimeType.split('/').pop()?.replace('vnd.google-apps.', '')}
                         </p>
                      </div>

                      {/* Quick Actions (Floating) */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
                         <button 
                           onClick={(e) => {
                              e.stopPropagation();
                              if (file.webViewLink) window.open(file.webViewLink, '_blank');
                           }}
                           className="p-1.5 bg-white shadow-lg border border-slate-100 text-indigo-500 hover:text-indigo-600 rounded-lg transition-all active:scale-95"
                           title="Download/Open"
                         >
                            <Download className="w-3.5 h-3.5" />
                         </button>
                         <button 
                           onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(file.id);
                           }}
                           className="p-1.5 bg-white shadow-lg border border-slate-100 text-rose-500 hover:text-rose-600 rounded-lg transition-all active:scale-95"
                           title="Delete"
                         >
                            <Trash2 className="w-3.5 h-3.5" />
                         </button>
                      </div>
                   </div>
                 ))
              ) : (
                 <div className="col-span-full h-64 flex flex-col items-center justify-center text-slate-400 space-y-4">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-inner border border-slate-100">
                       <Search className="w-10 h-10 opacity-20" />
                    </div>
                    <p className="font-bold text-sm tracking-wide">No files found here</p>
                 </div>
              )}
           </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-white border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400">
            <div className="flex items-center gap-6">
               <span className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                  Total Files: {files.length}
               </span>
               <span className="text-emerald-500 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Authorized Session
               </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
               <HardDrive className="w-3.5 h-3.5" />
               <span className="uppercase tracking-widest text-[9px]">Google Cloud v3</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleDriveModal;
