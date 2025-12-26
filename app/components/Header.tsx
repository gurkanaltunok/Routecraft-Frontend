'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { userApi, UserProfile } from '@/lib/api/user';
import NotificationBell from './NotificationBell';

interface HeaderProps {
  onSearch?: (query: string) => void;
}

const getImageUrl = (imageUrl?: string | null) => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${process.env.NEXT_PUBLIC_API_URL || 'http://13.53.168.27:5000'}${imageUrl}`;
};

export default function Header({ onSearch }: HeaderProps) {
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      userApi.getProfile()
        .then(setProfile)
        .catch(console.error);
    } else {
      setProfile(null);
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    router.push('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-6 sticky top-0 z-50 shadow-sm flex-shrink-0">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-1 group">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden bg-white border border-gray-200 shadow-sm group-hover:shadow-md transition-shadow">
          <img 
            src="/logo.png" 
            alt="RouteCraft Logo" 
            className="w-8 h-8 object-contain"
          />
        </div>
        <span className="text-xl font-bold hidden sm:block">
          <span className="text-[#1C4633]">Route</span>
          <span className="text-[#DA922B]">Craft</span>
        </span>
      </Link>

      {/* Navigation Links - Center */}
      <nav className="hidden md:flex items-center gap-1">
        <Link
          href="/discover"
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            pathname === '/discover'
              ? 'text-[#1C4633] bg-[#1C4633]/10'
              : 'text-gray-600 hover:text-[#1C4633] hover:bg-gray-100'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Discover
          </span>
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              pathname.startsWith('/admin')
                ? 'text-[#DA922B] bg-[#DA922B]/10'
                : 'text-gray-600 hover:text-[#DA922B] hover:bg-[#DA922B]/10'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Admin
            </span>
          </Link>
        )}
      </nav>

      {/* Right Side - User Menu */}
      <div className="flex items-center gap-2">
        {isAuthenticated ? (
          <>
            <NotificationBell />
            
            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 p-1.5 rounded-xl transition-all hover:bg-gray-100 ${
                  showUserMenu ? 'bg-gray-100' : ''
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-semibold overflow-hidden ring-2 ring-gray-100 ${
                  getImageUrl(profile?.profileImageUrl) ? 'bg-white' : 'bg-gradient-to-br from-[#1C4633] to-[#DA922B] text-white'
                }`}>
                  {getImageUrl(profile?.profileImageUrl) ? (
                    <img 
                      src={getImageUrl(profile?.profileImageUrl)!} 
                      alt={profile?.userName || 'Profile'} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    (profile?.userName?.[0] || user?.email?.charAt(0) || 'U').toUpperCase()
                  )}
                </div>
                <svg className={`w-4 h-4 text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="font-medium text-gray-900 truncate">{profile?.userName || 'User'}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <Link
                        href="/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-sm font-medium">My Profile</span>
                      </Link>
                      <Link
                        href="/routes"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        <span className="text-sm font-medium">My Routes</span>
                      </Link>
                      <Link
                        href="/favorites"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        <span className="text-sm font-medium">Favorites</span>
                      </Link>
                      
                      {isAdmin && (
                        <>
                          <div className="my-1 border-t border-gray-100"></div>
                          <Link
                            href="/admin"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-[#DA922B] hover:bg-[#DA922B]/5 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span className="text-sm font-medium">Admin Panel</span>
                          </Link>
                        </>
                      )}
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-100 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="text-sm font-medium">Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-[#1C4633] hover:bg-gray-100 rounded-lg transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#DA922B] to-[#DA922B]/90 rounded-lg hover:from-[#DA922B]/90 hover:to-[#DA922B]/80 transition-all shadow-sm hover:shadow-md"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
