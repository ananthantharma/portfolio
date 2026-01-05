
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import React, { Fragment, useEffect, useState } from 'react';

import { useBadgeSettings } from './BadgeSettingsContext';


const COLORS = [
    { name: 'Red', value: 'bg-red-500' },
    { name: 'Orange', value: 'bg-orange-500' },
    { name: 'Yellow', value: 'bg-yellow-500' },
    { name: 'Green', value: 'bg-green-500' },
    { name: 'Blue', value: 'bg-blue-500' },
    { name: 'Purple', value: 'bg-purple-500' },
    { name: 'Pink', value: 'bg-pink-500' },
    { name: 'Gray', value: 'bg-gray-500' },
];

const ANIMATIONS = [
    { name: 'Fast (0.5s)', value: '0.5s' },
    { name: 'Fast (1s)', value: '1s' },
    { name: 'Medium (2s)', value: '2s' },
    { name: 'Slow (3s)', value: '3s' },
    { name: 'Very Slow (5s)', value: '5s' },
];

interface BadgeSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const BadgeSettingsModal: React.FC<BadgeSettingsModalProps> = ({ isOpen, onClose }) => {
    const { settings, updateSettings } = useBadgeSettings();
    const [localSettings, setLocalSettings] = useState(settings);

    useEffect(() => {
        if (isOpen) {
            setLocalSettings(settings);
        }
    }, [isOpen, settings]);

    const handleSave = async () => {
        await updateSettings(localSettings);
        onClose();
    };

    const updateThreshold = (key: keyof typeof settings.thresholds, val: string) => {
        setLocalSettings(prev => ({
            ...prev,
            thresholds: { ...prev.thresholds, [key]: parseInt(val) || 0 }
        }));
    };

    const updateColor = (key: keyof typeof settings.colors, val: string) => {
        setLocalSettings(prev => ({
            ...prev,
            colors: { ...prev.colors, [key]: val }
        }));
    };

    const updateAnimation = (key: keyof typeof settings.animations, val: string) => {
        setLocalSettings(prev => ({
            ...prev,
            animations: { ...prev.animations, [key]: val }
        }));
    };

    return (
        <Transition.Root show={isOpen} as={Fragment}>
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
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                                    <button
                                        type="button"
                                        className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>

                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 w-full text-center sm:ml-4 sm:mt-0 sm:text-left">
                                        <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900 mb-4">
                                            Badge Notification Settings
                                        </Dialog.Title>

                                        <div className="space-y-6">

                                            {/* Critical */}
                                            <div className="border-b pb-4">
                                                <h4 className="font-medium text-sm text-gray-700 mb-2">Critical / Overdue</h4>
                                                <div className="grid grid-cols-3 gap-4 items-center">
                                                    <div>
                                                        <label className="text-xs text-gray-500 block">Days (&lt;=)</label>
                                                        <input type="number" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                            value={localSettings.thresholds.critical}
                                                            onChange={(e) => updateThreshold('critical', e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500 block">Color</label>
                                                        <select className="mt-1 block w-full rounded-md border-gray-300 py-1.5 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                                            value={localSettings.colors.critical}
                                                            onChange={(e) => updateColor('critical', e.target.value)}
                                                        >
                                                            {COLORS.map(c => <option key={c.value} value={c.value}>{c.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500 block">Pulse Speed</label>
                                                        <select className="mt-1 block w-full rounded-md border-gray-300 py-1.5 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                                            value={localSettings.animations.critical}
                                                            onChange={(e) => updateAnimation('critical', e.target.value)}
                                                        >
                                                            {ANIMATIONS.map(a => <option key={a.value} value={a.value}>{a.name}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Urgent */}
                                            <div className="border-b pb-4">
                                                <h4 className="font-medium text-sm text-gray-700 mb-2">Urgent</h4>
                                                <div className="grid grid-cols-3 gap-4 items-center">
                                                    <div>
                                                        <label className="text-xs text-gray-500 block">Days (&lt;=)</label>
                                                        <input type="number" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                            value={localSettings.thresholds.urgent}
                                                            onChange={(e) => updateThreshold('urgent', e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500 block">Color</label>
                                                        <select className="mt-1 block w-full rounded-md border-gray-300 py-1.5 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                                            value={localSettings.colors.urgent}
                                                            onChange={(e) => updateColor('urgent', e.target.value)}
                                                        >
                                                            {COLORS.map(c => <option key={c.value} value={c.value}>{c.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500 block">Pulse Speed</label>
                                                        <select className="mt-1 block w-full rounded-md border-gray-300 py-1.5 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                                            value={localSettings.animations.urgent}
                                                            onChange={(e) => updateAnimation('urgent', e.target.value)}
                                                        >
                                                            {ANIMATIONS.map(a => <option key={a.value} value={a.value}>{a.name}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Upcoming */}
                                            <div className="border-b pb-4">
                                                <h4 className="font-medium text-sm text-gray-700 mb-2">Upcoming</h4>
                                                <div className="grid grid-cols-2 gap-4 items-center">
                                                    <div>
                                                        <label className="text-xs text-gray-500 block">Days (&lt;=)</label>
                                                        <input type="number" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                            value={localSettings.thresholds.upcoming}
                                                            onChange={(e) => updateThreshold('upcoming', e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500 block">Color</label>
                                                        <select className="mt-1 block w-full rounded-md border-gray-300 py-1.5 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                                            value={localSettings.colors.upcoming}
                                                            onChange={(e) => updateColor('upcoming', e.target.value)}
                                                        >
                                                            {COLORS.map(c => <option key={c.value} value={c.value}>{c.name}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Planned (Long Term) */}
                                            <div className="pb-4">
                                                <h4 className="font-medium text-sm text-gray-700 mb-2">Planned & Long Term</h4>
                                                <div className="grid grid-cols-2 gap-4 items-center">
                                                    <div>
                                                        <label className="text-xs text-gray-500 block">Planned Color (&lt;= {localSettings.thresholds.planned} days)</label>
                                                        <select className="mt-1 block w-full rounded-md border-gray-300 py-1.5 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                                            value={localSettings.colors.planned}
                                                            onChange={(e) => updateColor('planned', e.target.value)}
                                                        >
                                                            {COLORS.map(c => <option key={c.value} value={c.value}>{c.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500 block">Long Term Color (&gt; {localSettings.thresholds.planned} days)</label>
                                                        <select className="mt-1 block w-full rounded-md border-gray-300 py-1.5 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                                            value={localSettings.colors.longTerm}
                                                            onChange={(e) => updateColor('longTerm', e.target.value)}
                                                        >
                                                            {COLORS.map(c => <option key={c.value} value={c.value}>{c.name}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                </div>
                                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                    <button
                                        type="button"
                                        className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2"
                                        onClick={handleSave}
                                    >
                                        Save Changes
                                    </button>
                                    <button
                                        type="button"
                                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                                        onClick={onClose}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
};
