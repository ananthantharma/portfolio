import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

interface SourcingEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: any; // If editing
    defaultDescription?: string; // For creating from Page
    sourcePageId?: string; // For linking
    onSave?: () => void;
}

export default function SourcingEventModal({
    isOpen,
    onClose,
    initialData,
    defaultDescription,
    sourcePageId,
    onSave
}: SourcingEventModalProps) {
    // Config Options
    const [config, setConfig] = useState<any>({
        facilities: [],
        activityTypes: [],
        sourcingStatuses: [],
        categoryLeads: []
    });

    // Form Data
    const [formData, setFormData] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [vendorsInput, setVendorsInput] = useState('');

    // Fetch Config
    useEffect(() => {
        if (isOpen) {
            loadConfig();
            if (initialData) {
                setFormData(initialData);
                setVendorsInput(initialData.vendors?.join(', ') || '');
            } else {
                // Reset for new
                setFormData({
                    description: defaultDescription || '',
                    sourcePageId: sourcePageId,
                    vendors: [],
                    existingVendor: false,
                    diversityClassification: false,
                    indigenousOpportunity: false,
                    onTrack: 'On Track',
                    vendorPerformance: 3,
                    riskLevel: 'Low',
                    status: 'Active'
                });
                setVendorsInput('');
            }
        }
    }, [isOpen, initialData]);

    const loadConfig = async () => {
        try {
            const res = await axios.get('/api/sourcing/config');
            setConfig(res.data);
        } catch (e) {
            console.error("Failed to load config", e);
        }
    };

    const updateConfig = async (key: string, newValue: string[], action: 'add' | 'remove', value?: string) => {
        try {
            const newConfig = { ...config, [key]: newValue };
            setConfig(newConfig); // Optimistic update
            await axios.post('/api/sourcing/config', { [key]: newValue });
        } catch (e) {
            console.error("Failed to update config", e);
            loadConfig(); // Revert on error
        }
    };

    const handleAddFieldOption = (field: string) => {
        const value = prompt(`Add new ${field}:`);
        if (value && !config[field].includes(value)) {
            updateConfig(field, [...config[field], value], 'add');
        }
    };

    const handleRemoveFieldOption = (field: string, value: string) => {
        if (confirm(`Remove "${value}" from list?`)) {
            updateConfig(field, config[field].filter((i: string) => i !== value), 'remove', value);
        }
    };

    const handleChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev: any) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                vendors: vendorsInput.split(',').map(v => v.trim()).filter(Boolean)
            };
            await axios.post('/api/sourcing/events', payload);
            if (onSave) onSave();
            onClose();
        } catch (error) {
            console.error('Error saving event:', error);
            alert('Failed to save event');
        } finally {
            setLoading(false);
        }
    };

    const renderSelectWithAdd = (label: string, name: string, configKey: string, options: string[]) => (
        <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                {label}
                <button type="button" onClick={() => handleAddFieldOption(configKey)} className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center">
                    <PlusIcon className="w-3 h-3 mr-1" /> Add
                </button>
            </label>
            <div className="relative">
                <select
                    name={name}
                    value={formData[name] || ''}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                    <option value="">Select...</option>
                    {options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
                {/* Optional: Add a way to delete selected option? Complex UI for select. 
             Maybe separate manage list button? keeping simple for now with prompt. 
         */}
            </div>
        </div>
    );

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                        <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
                            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                                <div className="flex justify-between items-start mb-6 border-b pb-4">
                                    <Dialog.Title className="text-xl font-semibold text-gray-900">
                                        {initialData ? 'Edit Sourcing Event' : 'New Sourcing Event'}
                                    </Dialog.Title>
                                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Basic Info */}
                                    <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg">
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700">Description (Free Text)</label>
                                            <input type="text" name="description" value={formData.description || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                        </div>
                                        {/* Facility */}
                                        {renderSelectWithAdd("Facility", "facility", "facilities", config.facilities)}
                                    </div>

                                    {/* Categorization */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="col-span-1">
                                            <label className="block text-sm font-medium text-gray-700">Commodity Category</label>
                                            <input type="text" name="commodityCategory" value={formData.commodityCategory || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-sm font-medium text-gray-700">Sub Category</label>
                                            <input type="text" name="subCategory" value={formData.subCategory || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                        </div>
                                        {renderSelectWithAdd("Category Lead", "categoryLead", "categoryLeads", config.categoryLeads)}
                                        <div className="col-span-1">
                                            <label className="block text-sm font-medium text-gray-700">Business Unit/Dept</label>
                                            <input type="text" name="department" value={formData.department || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                        </div>
                                    </div>

                                    {/* Vendor Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t pt-4">
                                        <div className="col-span-1 md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700">Vendor(s) (Comma separated)</label>
                                            <input type="text" value={vendorsInput} onChange={e => setVendorsInput(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="Vendor A, Vendor B..." />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-sm font-medium text-gray-700">Vendor Tier</label>
                                            <select name="vendorTier" value={formData.vendorTier || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                                                <option value="">Select...</option>
                                                <option value="Strategic">Strategic</option>
                                                <option value="Preferred">Preferred</option>
                                                <option value="Transactional">Transactional</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <label className="inline-flex items-center">
                                            <input type="checkbox" name="existingVendor" checked={!!formData.existingVendor} onChange={handleChange} className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                                            <span className="ml-2 text-sm text-gray-700">Existing Vendor</span>
                                        </label>
                                        <label className="inline-flex items-center">
                                            <input type="checkbox" name="diversityClassification" checked={!!formData.diversityClassification} onChange={handleChange} className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                                            <span className="ml-2 text-sm text-gray-700">Diversity Classification</span>
                                        </label>
                                        <label className="inline-flex items-center">
                                            <input type="checkbox" name="indigenousOpportunity" checked={!!formData.indigenousOpportunity} onChange={handleChange} className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                                            <span className="ml-2 text-sm text-gray-700">Indigenous Opp.</span>
                                        </label>
                                    </div>

                                    {/* Process Info */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t pt-4">
                                        {renderSelectWithAdd("Activity Type", "activityType", "activityTypes", config.activityTypes)}
                                        {renderSelectWithAdd("Sourcing Status", "sourcingStatus", "sourcingStatuses", config.sourcingStatuses)}
                                        <div className="col-span-1">
                                            <label className="block text-sm font-medium text-gray-700">Risk Level</label>
                                            <select name="riskLevel" value={formData.riskLevel || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                                                <option value="Low">Low</option>
                                                <option value="Medium">Medium</option>
                                                <option value="High">High</option>
                                            </select>
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-sm font-medium text-gray-700">Status</label>
                                            <select name="status" value={formData.status || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                                                <option value="Active">Active</option>
                                                <option value="Pending">Pending</option>
                                                <option value="Complete">Complete</option>
                                                <option value="On Hold">On Hold</option>
                                                <option value="Long Pause">Long Pause</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="col-span-1">
                                            <label className="block text-sm font-medium text-gray-700">On Track / Late</label>
                                            <select name="onTrack" value={formData.onTrack || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                                                <option value="On Track">On Track</option>
                                                <option value="Late">Late</option>
                                            </select>
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-sm font-medium text-gray-700">Vendor Performance (1-5)</label>
                                            <input type="number" name="vendorPerformance" min="1" max="5" value={formData.vendorPerformance || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                        </div>
                                    </div>

                                    {/* Dates & Financials */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t pt-4">
                                        <div className="col-span-1">
                                            <label className="block text-sm font-medium text-gray-700">Effective Date</label>
                                            <input type="date" name="effectiveDate" value={formData.effectiveDate ? new Date(formData.effectiveDate).toISOString().split('T')[0] : ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-sm font-medium text-gray-700">Expiration Date</label>
                                            <input type="date" name="expirationDate" value={formData.expirationDate ? new Date(formData.expirationDate).toISOString().split('T')[0] : ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-sm font-medium text-gray-700">Need Date</label>
                                            <input type="date" name="needDate" value={formData.needDate ? new Date(formData.needDate).toISOString().split('T')[0] : ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-sm font-medium text-gray-700">Renewal Type</label>
                                            <select name="renewalType" value={formData.renewalType || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                                                <option value="">Select...</option>
                                                <option value="Auto-renew">Auto-renew</option>
                                                <option value="Manual">Manual</option>
                                                <option value="One-time">One-time</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="col-span-1">
                                            <label className="block text-sm font-medium text-gray-700">MSA / VOR</label>
                                            <input type="text" name="msaVor" value={formData.msaVor || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-sm font-medium text-gray-700">Total Contract Value</label>
                                            <input type="number" name="estimatedContractValue" value={formData.estimatedContractValue || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-sm font-medium text-gray-700">Spend Type</label>
                                            <select name="spendType" value={formData.spendType || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                                                <option value="">Select...</option>
                                                <option value="OpEx">OpEx</option>
                                                <option value="CapEx">CapEx</option>
                                            </select>
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-sm font-medium text-gray-700">Cost Savings</label>
                                            <input type="number" name="costSavings" value={formData.costSavings || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-sm font-medium text-gray-700">Purchase Order</label>
                                            <input type="text" name="purchaseOrder" value={formData.purchaseOrder || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 rounded-b-lg">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto"
                                        >
                                            {loading ? 'Saving...' : 'Save Report'}
                                        </button>
                                        <button
                                            type="button"
                                            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                                            onClick={onClose}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </Dialog.Panel>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}
