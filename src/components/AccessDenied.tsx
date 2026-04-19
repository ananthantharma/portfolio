import React from 'react';
import Link from 'next/link';

interface AccessDeniedProps {
  message?: string;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({
  message = 'You do not have permission to access this area.',
}) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="max-w-md">
        <p className="mb-2 text-6xl font-black text-gray-200">403</p>
        <h1 className="mb-3 text-2xl font-bold text-gray-800">Access Restricted</h1>
        <p className="mb-6 text-base text-gray-500">{message}</p>
        <p className="mb-8 text-sm text-gray-400">
          If you believe you should have access, please contact{' '}
          <a
            href="mailto:lankanprinze@gmail.com"
            className="text-indigo-500 hover:underline font-medium">
            lankanprinze@gmail.com
          </a>{' '}
          with your Google account email address.
        </p>
        <Link
          href="/"
          className="inline-block rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 shadow-sm">
          Return Home
        </Link>
      </div>
    </div>
  );
};

export default AccessDenied;
