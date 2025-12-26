/* eslint-disable simple-import-sort/imports */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import InvoiceScanner from '@/components/Invoices/InvoiceScanner';
import InvoiceList from '@/components/Invoices/InvoiceList';

import Header from '@/components/Sections/Header';

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
            <div className="min-h-screen w-full bg-neutral-900 p-6 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-neutral-950 p-6 font-sans text-slate-200">
            <Header />
            <div className="max-w-7xl mx-auto space-y-8 pt-20">
                <header>
                    <h1 className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-3xl font-extrabold text-transparent">
                        Smart Invoice Tracker
                    </h1>
                    <p className="mt-2 text-slate-400">
                        AI-powered expense tracking. Scan your bills and let Gemini do the rest.
                    </p>
                </header>

                <section className="bg-neutral-900 rounded-2xl shadow-sm border border-neutral-800 p-6">
                    <h2 className="text-xl font-bold mb-6 text-white">Add New Invoice</h2>
                    <InvoiceScanner onSaved={handleInvoiceSaved} />
                </section>

                <section className="bg-neutral-900 rounded-2xl shadow-sm border border-neutral-800 p-6">
                    <h2 className="text-xl font-bold mb-6 text-white">Recent Invoices</h2>
                    <InvoiceList key={refreshTrigger} />
                </section>
            </div>
        </div>
    );
}
