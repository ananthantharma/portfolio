/* eslint-disable simple-import-sort/imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/jsx-sort-props */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, ExternalLink, Download, Calendar } from 'lucide-react';
import { IInvoice } from '@/models/Invoice'; // We'll just use the interface structure

interface Invoice extends IInvoice {
    _id: string;
}

export default function InvoiceList() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Date Filter State
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const fetchInvoices = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/invoices');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch invoices');
            setInvoices(data.data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const filteredInvoices = useMemo(() => {
        return invoices.filter(invoice => {
            const invoiceDate = new Date(invoice.date || invoice.createdAt).getTime();
            const start = startDate ? new Date(startDate).getTime() : 0;
            const end = endDate ? new Date(endDate).getTime() + (24 * 60 * 60 * 1000) : Infinity; // Include the end date fully

            return invoiceDate >= start && invoiceDate < end;
        });
    }, [invoices, startDate, endDate]);

    const handleExportCSV = () => {
        const headers = ['Date', 'Vendor', 'Category', 'Description', 'Amount', 'Tax', 'Currency', 'Status', 'GST Number', 'Image URL'];
        const csvRows = [headers.join(',')];

        filteredInvoices.forEach(invoice => {
            const row = [
                new Date(invoice.date || invoice.createdAt).toLocaleDateString(),
                `"${(invoice.vendorName || '').replace(/"/g, '""')}"`,
                `"${(invoice.category || '').replace(/"/g, '""')}"`,
                `"${(invoice.description || '').replace(/"/g, '""')}"`,
                invoice.amount || 0,
                invoice.tax || 0,
                invoice.currency || 'CAD',
                invoice.status,
                `"${(invoice.gstNumber || '').replace(/"/g, '""')}"`,
                invoice.imageUrl || ''
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `invoices_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-800">
                Error loading invoices: {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Controls: Date Filter & Export */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/5 p-4 rounded-lg border border-gray-700/50">
                <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-gray-400" />
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                <button
                    onClick={handleExportCSV}
                    className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    <Download size={16} />
                    <span>Export CSV</span>
                </button>
            </div>

            {filteredInvoices.length === 0 ? (
                <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
                    <p className="text-gray-400">No invoices found for this period.</p>
                </div>
            ) : (
                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-700">
                            <thead className="bg-gray-900/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Vendor</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Tax</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-gray-800 divide-y divide-gray-700">
                                {filteredInvoices.map((invoice) => (
                                    <tr key={invoice._id} className="hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                            {new Date(invoice.date || invoice.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                                            {invoice.vendorName || 'Unknown Vendor'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                            <span className="px-2 py-1 bg-gray-700 rounded text-xs">
                                                {invoice.category || 'Uncategorized'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white">
                                            {invoice.currency} {invoice.amount?.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                            {invoice.tax ? `${invoice.currency} ${invoice.tax.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${invoice.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                                invoice.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {invoice.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {invoice.imageUrl && (
                                                <>
                                                    <a
                                                        href={invoice.imageUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-indigo-400 hover:text-indigo-300 flex items-center justify-end space-x-1"
                                                        title="View Attachment"
                                                    >
                                                        <ExternalLink size={16} />
                                                        <span className="hidden sm:inline">View</span>
                                                    </a>
                                                    <a
                                                        href={invoice.imageUrl}
                                                        download={`Invoice_${invoice.vendorName || 'scan'}_${invoice.date || 'date'}.jpg`}
                                                        className="text-green-400 hover:text-green-300 flex items-center justify-end space-x-1 ml-3"
                                                        title="Download Attachment"
                                                    >
                                                        <Download size={16} />
                                                        <span className="hidden sm:inline">Save</span>
                                                    </a>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
