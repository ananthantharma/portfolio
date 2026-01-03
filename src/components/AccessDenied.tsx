import React from 'react';
import Link from 'next/link';

interface AccessDeniedProps {
  message?: string;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({message = 'Access Denied. Please contact Ananthan.'}) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <h1 className="mb-4 text-4xl font-bold text-gray-800">403</h1>
      <p className="mb-8 text-xl text-gray-600">{message}</p>
      <Link href="/" className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700">
        Return Home
      </Link>
    </div>
  );
};

export default AccessDenied;
