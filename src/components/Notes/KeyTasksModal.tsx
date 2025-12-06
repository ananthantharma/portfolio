import { Dialog, Transition } from '@headlessui/react';
import { FlagIcon, XMarkIcon } from '@heroicons/react/24/outline';
import React, { Fragment, useEffect, useState } from 'react';

import { INotePage } from '@/models/NotePage';

interface KeyTasksModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTask: (task: any) => void;
    fetchFlaggedTasks: () => Promise<INotePage[]>;
}

const KeyTasksModal: React.FC<KeyTasksModalProps> = ({ isOpen, onClose, onSelectTask, fetchFlaggedTasks }) => {
    const [tasks, setTasks] = useState<INotePage[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadTasks();
        }
    }, [isOpen]);

    const loadTasks = async () => {
        setLoading(true);
        try {
            const data = await fetchFlaggedTasks();
            setTasks(data);
        } catch (error) {
            console.error("Failed to load flagged tasks", error);
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
                                        <FlagIcon className="h-5 w-5 text-red-500" />
                                        Key Tasks
                                    </Dialog.Title>
                                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="mt-2">
                                    {loading ? (
                                        <div className="text-center py-4 text-gray-500">Loading tasks...</div>
                                    ) : tasks.length === 0 ? (
                                        <div className="text-center py-4 text-gray-500">No flagged tasks found.</div>
                                    ) : (
                                        <ul className="divide-y divide-gray-100">
                                            {tasks.map((task: any) => (
                                                <li
                                                    key={task._id}
                                                    className="py-3 hover:bg-gray-50 cursor-pointer rounded-md px-2 transition-colors"
                                                    onClick={() => onSelectTask(task)}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-medium text-gray-900">{task.title}</p>
                                                            <p className="text-xs text-gray-500">
                                                                {task.sectionId?.name ? `${task.sectionId.name}` : 'Unknown Section'}
                                                            </p>
                                                        </div>
                                                        <span className="text-xs text-gray-400">
                                                            {new Date(task.updatedAt).toLocaleDateString()}
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

export default KeyTasksModal;
