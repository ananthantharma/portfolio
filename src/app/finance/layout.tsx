import { CurrencyDollarIcon, HomeIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/pages/api/auth/[...nextauth]';

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="border-b border-gray-800 bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-xl font-bold text-emerald-500">Finance Portfolio</span>
              </div>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  <Link
                    className="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2"
                    href="/">
                    <HomeIcon className="h-5 w-5" />
                    Home
                  </Link>
                  <Link
                    className="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2"
                    href="/dashboard">
                    <Squares2X2Icon className="h-5 w-5" />
                    Main Dashboard
                  </Link>
                  <Link
                    aria-current="page"
                    className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white flex items-center gap-2"
                    href="/finance">
                    <CurrencyDollarIcon className="h-5 w-5" />
                    Finance
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main>
        <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
