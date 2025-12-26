/* eslint-disable simple-import-sort/imports */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import InvoiceScanner from '@/components/Invoices/InvoiceScanner';
import InvoiceList from '@/components/Invoices/InvoiceList';

export default function SmartInvoicesPage() {
    const { status } = useSession();
    const router = useRouter();
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        }
    }, [status, router]);

    /* eslint-disable react-memo/require-usememo */
    const handleInvoiceSaved = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    if (status === 'loading') {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 p-6 font-sans text-slate-800">
            <div className="max-w-7xl mx-auto space-y-8">
                <header>
                    <h1 className="bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-3xl font-extrabold text-transparent">
                        Smart Invoice Tracker
                    </h1>
                    <p className="mt-2 text-slate-500">
                        AI-powered expense tracking. Scan your bills and let Gemini do the rest.
                    </p>
                </header>

                <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <h2 className="text-xl font-bold mb-6 text-slate-800">Add New Invoice</h2>
                    <InvoiceScanner onSaved={handleInvoiceSaved} />
                </section>

                <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <h2 className="text-xl font-bold mb-6 text-slate-800">Recent Invoices</h2>
                    <InvoiceList key={refreshTrigger} />
                </section>
            </div>
        </div>
    );
}
