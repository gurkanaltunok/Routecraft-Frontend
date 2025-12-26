import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F4F4F2] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-[#1C4633]/20 p-8 text-center">
        <h2 className="text-2xl font-semibold text-[#1C4633] mb-4">404 - Page Not Found</h2>
        <p className="text-gray-600 mb-6">
          The page you are looking for could not be found.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2 bg-[#DA922B] text-white rounded-lg hover:bg-[#DA922B]/90 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

