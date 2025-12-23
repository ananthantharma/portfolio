import { X } from 'lucide-react';
import React, { memo, useEffect, useState } from 'react';

import { PasswordEntry } from '../../data/dataDef';

interface PasswordModalProps {
    initialData?: Partial<PasswordEntry>;
    isOpen: boolean;
    mode: 'add' | 'edit';
    onClose: () => void;
    onSave: (entry: Omit<PasswordEntry, '_id'>) => Promise<void>;
}

const PasswordModal: React.FC<PasswordModalProps> = memo(({ initialData, isOpen, mode, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        title: '',
        site: '',
        username: '',
        password: '',
        notes: '',
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                title: initialData.title || '',
                site: initialData.site || '',
                username: initialData.username || '',
                password: initialData.password || '',
                notes: initialData.notes || '',
            });
        } else if (isOpen && mode === 'add') {
            setFormData({ title: '', site: '', username: '', password: '', notes: '' });
        }
    }, [isOpen, initialData, mode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Failed to save password', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-2xl rounded-2xl bg-[#1E1E1E] p-8 shadow-2xl border border-zinc-800">
                <button
                    className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
                    onClick={onClose}>
                    <X size={20} />
                </button>

                <h3 className="mb-6 text-2xl font-bold text-white flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white text-lg">
                        {mode === 'add' ? '+' : '✎'}
                    </span>
                    {mode === 'add' ? 'Add New Item' : 'Edit Item'}
                </h3>

                <form className="grid grid-cols-1 gap-6 md:grid-cols-2" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Title</label>
                        <input
                            className="w-full rounded-xl bg-zinc-900/50 p-3 text-white border border-zinc-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. Netflix"
                            required
                            type="text"
                            value={formData.title}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Website URL</label>
                        <input
                            className="w-full rounded-xl bg-zinc-900/50 p-3 text-white border border-zinc-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                            onChange={e => setFormData({ ...formData, site: e.target.value })}
                            placeholder="https://netflix.com"
                            type="text"
                            value={formData.site}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Username / Email</label>
                        <input
                            className="w-full rounded-xl bg-zinc-900/50 p-3 text-white border border-zinc-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                            placeholder="user@example.com"
                            type="text"
                            value={formData.username}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Password</label>
                        <input
                            className="w-full rounded-xl bg-zinc-900/50 p-3 text-white border border-zinc-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            placeholder="********"
                            type="text"
                            value={formData.password}
                        />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Notes</label>
                        <textarea
                            className="w-full rounded-xl bg-zinc-900/50 p-3 text-white border border-zinc-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Additional notes..."
                            rows={3}
                            value={formData.notes}
                        />
                    </div>

                    <div className="md:col-span-2 mt-2 flex justify-end gap-3 border-t border-zinc-800 pt-6">
                        <button
                            className="rounded-lg px-5 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors font-medium"
                            disabled={loading}
                            onClick={onClose}
                            type="button">
                            Cancel
                        </button>
                        <button
                            className="rounded-lg bg-orange-500 px-6 py-2.5 font-bold text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                            type="submit">
                            {loading ? 'Saving...' : 'Save Item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
});

PasswordModal.displayName = 'PasswordModal';

export default PasswordModal;
