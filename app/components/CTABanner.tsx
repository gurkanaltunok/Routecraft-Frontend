'use client';

import Link from 'next/link';

export default function CTABanner() {
  return (
    <section className="py-20 bg-gradient-to-r from-[#1C4633] via-[#2d5a3d] to-[#1C4633] relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Ready to start your journey?
        </h2>
        <p className="text-xl text-gray-100 mb-8 max-w-2xl mx-auto">
          Join thousands of travelers sharing their favorite routes and discovering new adventures.
        </p>
        <Link
          href="/register"
          className="inline-block px-10 py-4 bg-[#DA922B] text-white text-lg font-semibold rounded-lg hover:bg-[#DA922B]/90 transition-all transform hover:scale-105 shadow-2xl"
        >
          Join RouteCraft Now
        </Link>
      </div>
    </section>
  );
}

