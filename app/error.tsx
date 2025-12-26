'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F4F4F2] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-[#1C4633]/20 p-8 text-center">
        <h2 className="text-2xl font-semibold text-[#1C4633] mb-4">An Error Occurred</h2>
        <p className="text-gray-600 mb-6">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          onClick={reset}
          className="px-6 py-2 bg-[#DA922B] text-white rounded-lg hover:bg-[#DA922B]/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

