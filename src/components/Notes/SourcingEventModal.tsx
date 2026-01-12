import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PlusIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

interface SourcingEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: any;
    defaultDescription?: string;
    defaultEventName?: string;
    sourcePageId?: string;
    onSave?: () => void;
}

export default function SourcingEventModal({
    isOpen,
    onClose,
    initialData,
    defaultDescription,
    defaultEventName,
    sourcePageId,
    onSave
}: SourcingEventModalProps) {
    // Config Options
    const [config, setConfig] = useState<any>({
        facilities: [],
        activityTypes: [],
        sourcingStatuses: [],
        categoryLeads: [],
        statuses: [],
        departments: [],
        renewalTypes: [],
        spendTypes: [],
        msaVorOptions: []
    });

    // Form Data
    const [formData, setFormData] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [vendorsInput, setVendorsInput] = useState('');

    // Section Visibility State (Default Open)
    const [sectionsOpen, setSectionsOpen] = useState({
        ownership: true,
        vendor: true,
        timeline: true,
        financials: true
    });

    const toggleSection = (section: keyof typeof sectionsOpen) => {
        setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Fetch Config
    useEffect(() => {
        if (isOpen) {
            loadConfig();
            if (initialData) {
                setFormData(initialData);
                setVendorsInput(initialData.vendors?.join(', ') || '');
            } else {
                // New Event Styling
                setFormData({
                    eventName: defaultEventName || '',
                    description: defaultDescription || '',
                    sourcePageId: sourcePageId,
                    status: 'Active',
                    categoryLead: 'Unassigned',
                    riskLevel: 'Low',
                    // Set defaults for other selects if needed
                    activityType: 'New Requirement',
                    sourcingStatus: 'Draft'
                });
                setVendorsInput('');
            }
        }
    }, [isOpen, initialData, defaultDescription, defaultEventName, sourcePageId]);                // Reset for new
    setFormData({
        eventName: '',
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

const updateConfig = async (key: string, newValue: string[]) => {
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
        updateConfig(field, [...config[field], value]);
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

const renderSelectWithAdd = (label: string, name: string, configKey: string, options: string[], className = "col-span-1") => (
    <div className={className}>
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
                {options && options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        </div>
    </div>
);

const CollapsibleSectionHeader = ({ title, section, isOpen }: { title: string, section: keyof typeof sectionsOpen, isOpen: boolean }) => (
    <div
        className="flex justify-between items-center cursor-pointer bg-gray-100 p-2 rounded-t-lg mt-4 border-b border-gray-200"
        onClick={() => toggleSection(section)}
    >
        <h3 className="text-md font-medium text-gray-900">{title}</h3>
        {isOpen ? <ChevronUpIcon className="w-4 h-4 text-gray-500" /> : <ChevronDownIcon className="w-4 h-4 text-gray-500" />}
    </div>
);

return (
    <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="fixed inset-0 z-10 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                    <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-[95vw]">
                        <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                            <div className="flex justify-between items-start mb-6 border-b pb-4">
                                <Dialog.Title className="text-xl font-semibold text-gray-900">
                                    {initialData ? 'Edit Sourcing Event' : 'New Sourcing Event'}
                                </Dialog.Title>
                                <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* 1. Core Identity (Always Visible) */}
                                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Core Identity</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        {/* Row 1 */}
                                        <div className="md:col-span-3">
                                            <label className="block text-sm font-medium text-gray-700">Sourcing Event Name</label>
                                            <input
                                                type="text"
                                                name="eventName"
                                                value={formData.eventName || ''}
                                                onChange={handleChange}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                placeholder="E.g. Q1 Office Supplies Procurement"
                                            />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700">Need Date</label>
                                            <input
                                                type="date"
                                                name="needDate"
                                                value={formData.needDate ? new Date(formData.needDate).toISOString().split('T')[0] : ''}
                                                onChange={handleChange}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            />
                                        </div>

                                        {/* Description */}
                                        <div className="md:col-span-4">
                                            <label className="block text-sm font-medium text-gray-700">Description</label>
                                            <textarea
                                                name="description"
                                                rows={2}
                                                value={formData.description || ''}
                                                onChange={handleChange}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            />
                                        </div>

                                        {/* Row 2: Category Lead, Activity Type, Risk Level, Status, Sourcing Status */}
                                        <div className="md:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700">Primary Lead</label>
                                            <input
                                                type="text"
                                                name="primaryLead"
                                                value={formData.primaryLead || ''}
                                                onChange={handleChange}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            />
                                        </div>
                                        {renderSelectWithAdd("Category Lead", "categoryLead", "categoryLeads", config.categoryLeads)}
                                        {renderSelectWithAdd("Activity Type", "activityType", "activityTypes", config.activityTypes)}
                                        <div className="col-span-1">
                                            <label className="block text-sm font-medium text-gray-700">Risk Level</label>
                                            <select name="riskLevel" value={formData.riskLevel || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                                                <option value="Low">Low</option>
                                                <option value="Medium">Medium</option>
                                                <option value="High">High</option>
                                            </select>
                                        </div>
                                        {renderSelectWithAdd("Status", "status", "statuses", config.statuses)}
                                        {renderSelectWithAdd("Sourcing Status", "sourcingStatus", "sourcingStatuses", config.sourcingStatuses)}
                                    </div>
                                </div>

                                {/* Additional Details (Notes) - Moved Up */}
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes & Additional Details</label>
                                    <textarea
                                        name="notes"
                                        rows={3}
                                        value={formData.notes || ''}
                                        onChange={handleChange}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        placeholder="Internal notes, next steps, or general comments..."
                                    />
                                </div>

                                {/* 2. Ownership & Categorization */}
                                <div className="border border-gray-200 rounded-lg">
                                    <CollapsibleSectionHeader title="Ownership & Categorization" section="ownership" isOpen={sectionsOpen.ownership} />
                                    {sectionsOpen.ownership && (
                                        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                                            {renderSelectWithAdd("Business Unit/Dept", "department", "departments", config.departments, "col-span-2")}
                                            {renderSelectWithAdd("Facility", "facility", "facilities", config.facilities, "col-span-2")}

                                            <div className="col-span-1 md:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700">Contact</label>
                                                <input type="text" name="contact" value={formData.contact || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                            </div>
                                            <div className="col-span-1 md:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700">Commodity Category</label>
                                                <input type="text" name="commodityCategory" value={formData.commodityCategory || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                            </div>
                                            <div className="col-span-1 md:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700">Sub Category</label>
                                                <input type="text" name="subCategory" value={formData.subCategory || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 3. Vendor Information */}
                                <div className="border border-gray-200 rounded-lg">
                                    <CollapsibleSectionHeader title="Vendor Information" section="vendor" isOpen={sectionsOpen.vendor} />
                                    {sectionsOpen.vendor && (
                                        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-6">
                                            <div className="md:col-span-2">
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
                                            <div className="col-span-1">
                                                <label className="block text-sm font-medium text-gray-700">Performance (1-5)</label>
                                                <input type="number" name="vendorPerformance" min="1" max="5" value={formData.vendorPerformance || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                            </div>
                                            <div className="md:col-span-4 flex gap-6">
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
                                        </div>
                                    )}
                                </div>

                                {/* 4. Timeline & Schedule */}
                                <div className="border border-gray-200 rounded-lg">
                                    <CollapsibleSectionHeader title="Timeline & Schedule" section="timeline" isOpen={sectionsOpen.timeline} />
                                    {sectionsOpen.timeline && (
                                        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="col-span-1">
                                                <label className="block text-sm font-medium text-gray-700">Effective Date</label>
                                                <input type="date" name="effectiveDate" value={formData.effectiveDate ? new Date(formData.effectiveDate).toISOString().split('T')[0] : ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-sm font-medium text-gray-700">Expiration Date</label>
                                                <input type="date" name="expirationDate" value={formData.expirationDate ? new Date(formData.expirationDate).toISOString().split('T')[0] : ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                            </div>
                                            {renderSelectWithAdd("Renewal Type", "renewalType", "renewalTypes", config.renewalTypes)}
                                            <div className="col-span-1">
                                                <label className="block text-sm font-medium text-gray-700">On Track / Late</label>
                                                <select name="onTrack" value={formData.onTrack || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                                                    <option value="On Track">On Track</option>
                                                    <option value="Late">Late</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 5. Financials & Contracts */}
                                <div className="border border-gray-200 rounded-lg">
                                    <CollapsibleSectionHeader title="Financials & Contracts" section="financials" isOpen={sectionsOpen.financials} />
                                    {sectionsOpen.financials && (
                                        <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                                            <div className="col-span-1">
                                                <label className="block text-sm font-medium text-gray-700">Total Contract Value</label>
                                                <input type="number" name="estimatedContractValue" value={formData.estimatedContractValue || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-sm font-medium text-gray-700">Cost Savings</label>
                                                <input type="number" name="costSavings" value={formData.costSavings || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                            </div>
                                            {renderSelectWithAdd("Spend Type", "spendType", "spendTypes", config.spendTypes)}
                                            {renderSelectWithAdd("MSA / VOR", "msaVor", "msaVorOptions", config.msaVorOptions)}
                                            <div className="col-span-1">
                                                <label className="block text-sm font-medium text-gray-700">Purchase Order</label>
                                                <input type="text" name="purchaseOrder" value={formData.purchaseOrder || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                            </div>
                                        </div>
                                    )}
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
