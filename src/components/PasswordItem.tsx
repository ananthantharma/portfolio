import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon, TrashIcon, PencilIcon, LinkIcon } from '@heroicons/react/24/outline';

interface PasswordItemProps {
    password: any;
    onDelete: (id: string) => void;
    onUpdate: (id: string, data: any) => void;
}

const PasswordItem: React.FC<PasswordItemProps> = ({ password, onDelete, onUpdate }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        title: password.title,
        site: password.site,
        username: password.username,
        password: password.password,
        notes: password.notes,
    });

    const handleCopy = () => {
        navigator.clipboard.writeText(password.password);
        alert("Password copied to clipboard!");
    };

    const handleSave = () => {
        onUpdate(password._id, editData);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="mb-4 rounded-lg bg-gray-800 p-4 shadow-md border border-gray-700">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <input
                        type="text"
                        value={editData.title}
                        onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                        className="rounded bg-gray-700 p-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Title (e.g. Netflix)"
                    />
                    <input
                        type="text"
                        value={editData.site}
                        onChange={(e) => setEditData({ ...editData, site: e.target.value })}
                        className="rounded bg-gray-700 p-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Website URL"
                    />
                    <input
                        type="text"
                        value={editData.username}
                        onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                        className="rounded bg-gray-700 p-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Username / Email"
                    />
                    <div className="relative">
                        <input
                            type="text"
                            value={editData.password}
                            onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                            className="w-full rounded bg-gray-700 p-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Password"
                        />
                    </div>
                    <textarea
                        value={editData.notes}
                        onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                        className="col-span-1 md:col-span-2 rounded bg-gray-700 p-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Notes"
                        rows={2}
                    />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                    <button onClick={() => setIsEditing(false)} className="rounded px-3 py-1 text-gray-400 hover:text-white">Cancel</button>
                    <button onClick={handleSave} className="rounded bg-orange-500 px-3 py-1 text-white hover:bg-orange-600">Save</button>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-4 flex flex-col justify-between rounded-lg bg-gray-800 p-4 shadow-md border border-gray-700 md:flex-row md:items-start">
            <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-orange-500">{password.title}</h3>
                    {password.site && (
                        <a href={password.site} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white" title={password.site}>
                            <LinkIcon className="h-5 w-5" />
                        </a>
                    )}
                </div>

                {password.username && (
                    <p className="text-sm text-gray-300">
                        <span className="font-semibold text-gray-500">User:</span> {password.username}
                    </p>
                )}

                {password.notes && (
                    <p className="text-sm text-gray-400 italic border-l-2 border-gray-600 pl-2">
                        {password.notes}
                    </p>
                )}
            </div>

            <div className="mt-4 flex items-center gap-4 md:mt-0 md:ml-4">
                {password.password && (
                    <>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password.password}
                                readOnly
                                className="rounded bg-gray-700 px-3 py-1 text-white focus:outline-none w-32 md:w-40"
                            />
                            <button
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                            >
                                {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                            </button>
                        </div>
                        <button onClick={handleCopy} className="text-sm text-blue-400 hover:text-blue-300">Copy</button>
                    </>
                )}
                <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-white">
                    <PencilIcon className="h-5 w-5" />
                </button>
                <button onClick={() => onDelete(password._id)} className="text-red-400 hover:text-red-300">
                    <TrashIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};

export default PasswordItem;
