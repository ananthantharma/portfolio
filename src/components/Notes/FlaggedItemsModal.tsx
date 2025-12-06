import { Dialog, Transition } from '@headlessui/react';
import { FlagIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import React, { Fragment, useEffect, useState } from 'react';

import { INotePage } from '@/models/NotePage';

interface FlaggedItemsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTask: (task: any) => void;
    fetchItems: () => Promise<INotePage[]>;
    title: string;
    icon?: 'flag' | 'important';
}

const FlaggedItemsModal: React.FC<FlaggedItemsModalProps> = ({ isOpen, onClose, onSelectTask, fetchItems, title, icon = 'flag' }) => {
    const [items, setItems] = useState<INotePage[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadItems();
        }
    }, [isOpen]);

    const loadItems = async () => {
        setLoading(true);
        try {
            const data = await fetchItems();
            setItems(data);
        } catch (error) {
            console.error(`Failed to load ${title}`, error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex justify-between items-center mb-4">
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 flex items-center gap-2">
                                        {icon === 'important' ? (
                                            <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
                                        ) : (
                                            <FlagIcon className="h-5 w-5 text-red-500" />
                                        )}
                                        {title}
                                    </Dialog.Title>
                                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="mt-2">
                                    {loading ? (
                                        <div className="text-center py-4 text-gray-500">Loading...</div>
                                    ) : items.length === 0 ? (
                                        <div className="text-center py-4 text-gray-500">No items found.</div>
                                    ) : (
                                        <ul className="divide-y divide-gray-100">
                                            {items.map((item: any) => (
                                                <li
                                                    key={item._id}
                                                    className="py-3 hover:bg-gray-50 cursor-pointer rounded-md px-2 transition-colors"
                                                    onClick={() => onSelectTask(item)}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-medium text-gray-900">{item.title}</p>
                                                            <p className="text-xs text-gray-500">
                                                                {item.sectionId?.name ? `${item.sectionId.name}` : 'Unknown Section'}
                                                            </p>
                                                        </div>
                                                        <span className="text-xs text-gray-400">
                                                            {new Date(item.updatedAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default FlaggedItemsModal;
