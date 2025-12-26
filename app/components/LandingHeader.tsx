'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LandingHeader() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white shadow-md'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={scrollToTop}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
              <img 
                src="/logo.png" 
                alt="RouteCraft Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-xl font-bold">
              <span className={isScrolled ? 'text-[#1C4633]' : 'text-white'}>Route</span>
              <span className="text-[#DA922B]">Craft</span>
            </span>
          </button>

          {/* Navigation Buttons */}
          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isScrolled
                  ? 'text-gray-700 hover:text-[#1C4633]'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-6 py-2 text-sm font-medium text-white bg-[#DA922B] rounded-lg hover:bg-[#DA922B]/90 transition-colors shadow-lg"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

