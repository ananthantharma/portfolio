'use client';

import Link from 'next/link';
import {useRouter} from 'next/router';
import React from 'react';

const NAV = [
  {href: '/supplier-risk', label: 'Dashboard', icon: '📊'},
  {href: '/supplier-risk/suppliers', label: 'Suppliers', icon: '🏭'},
  {href: '/supplier-risk/alerts', label: 'Alerts', icon: '🔔'},
  {href: '/supplier-risk/onboarding', label: 'Onboarding', icon: '📋'},
];

interface Props {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  unreadCount?: number;
}

export const SupplierRiskLayout: React.FC<Props> = ({children, title, actions, unreadCount}) => {
  const router = useRouter();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="hidden w-56 flex-shrink-0 border-r border-gray-200 bg-white lg:flex lg:flex-col">
        <div className="border-b border-gray-100 px-5 py-5">
          <Link href="/supplier-risk" className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <div>
              <p className="text-sm font-bold leading-tight text-gray-800">Supplier Risk</p>
              <p className="text-[10px] text-gray-400">Risk Intelligence Platform</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map(item => {
            const active = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {item.label === 'Alerts' && unreadCount && unreadCount > 0 ? (
                  <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-gray-100 p-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-600">
            ← Back to Portfolio
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
          <div className="flex h-14 items-center justify-between px-4 lg:px-6">
            {/* Mobile nav */}
            <div className="flex items-center gap-3 lg:hidden">
              <span className="text-xl">🛡️</span>
              <span className="font-bold text-gray-800">Supplier Risk</span>
            </div>
            <div className="hidden font-semibold text-gray-800 lg:block">{title}</div>
            <div className="flex items-center gap-2">
              {actions}
              {/* Mobile nav links */}
              <div className="flex gap-1 lg:hidden">
                {NAV.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg p-2 text-sm ${router.pathname === item.href ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                    title={item.label}>
                    {item.icon}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
};
