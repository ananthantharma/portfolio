import { Dialog, Transition } from '@headlessui/react';
import { ExclamationTriangleIcon, FlagIcon, XMarkIcon } from '@heroicons/react/24/outline';
import React, { Fragment, useEffect, useState } from 'react';

import { INotePage } from '@/models/NotePage';

interface FlaggedItemsModalProps {
    fetchItems: () => Promise<INotePage[]>;
    icon?: 'flag' | 'important';
    isOpen: boolean;
    onClose: () => void;
    onSelectTask: (task: INotePage) => void;
    title: string;
}

const FlaggedItemsModal: React.FC<FlaggedItemsModalProps> = React.memo(({ fetchItems, icon = 'flag', isOpen, onClose, onSelectTask, title }) => {
    const [items, setItems] = useState<INotePage[]>([]);
    const [loading, setLoading] = useState(false);

    const loadItems = React.useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchItems();
            setItems(data);
        } catch (error) {
            console.error(`Failed to load ${title}`, error);
        } finally {
            setLoading(false);
        }
    }, [fetchItems, title]);

    useEffect(() => {
        if (isOpen) {
            loadItems();
        }
    }, [isOpen, loadItems]);

    return (
        <Transition appear as={Fragment} show={isOpen}>
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
                                <div className="flex items-center justify-between mb-4">
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 flex items-center gap-2">
                                        {icon === 'important' ? (
                                            <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
                                        ) : (
                                            <FlagIcon className="h-5 w-5 text-red-500" />
                                        )}
                                        {title}
                                    </Dialog.Title>
                                    <button className="text-gray-400 hover:text-gray-500" onClick={onClose}>
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
                                            {items.map((item) => (
                                                <li
                                                    key={item._id}
                                                    className="py-3 hover:bg-gray-50 cursor-pointer rounded-md px-2 transition-colors"
                                                    onClick={() => onSelectTask(item)}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <p className="font-medium text-gray-900">{item.title}</p>
                                                            <p className="text-xs text-gray-500">
                                                                {(item.sectionId as any)?.name ? `${(item.sectionId as any).name}` : 'Unknown Section'}
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
});

export default FlaggedItemsModal;
