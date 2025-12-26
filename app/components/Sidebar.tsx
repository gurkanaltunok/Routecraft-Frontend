'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const menuItems = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      label: 'Home',
      href: '/',
      requiresAuth: false,
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      label: 'My Routes',
      href: '/routes',
      requiresAuth: true,
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      label: 'Groups',
      href: '/groups',
      requiresAuth: true,
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      label: 'Favorites',
      href: '/favorites',
      requiresAuth: true,
    },
  ];

  const routeTypes = [
    {
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="19" r="3" />
          <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
          <circle cx="18" cy="5" r="3" />
        </svg>
      ),
      label: 'Trip',
      href: '/trips',
      requiresAuth: false,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: 'Hiking',
      href: '/hiking',
      requiresAuth: false,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  const handleItemClick = (e: React.MouseEvent<HTMLAnchorElement>, item: { requiresAuth: boolean }) => {
    if (item.requiresAuth && !isAuthenticated) {
      e.preventDefault();
      showToast('Please log in to access this feature', 'info');
      setTimeout(() => {
        router.push('/login');
      }, 500);
      if (window.innerWidth < 1024) {
        onClose();
      }
    } else {
      if (window.innerWidth < 1024) {
        onClose();
      }
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-16 left-0 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 w-64 z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto shadow-sm ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Main Navigation */}
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleItemClick(e, item)}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#1C4633] to-[#1C4633]/90 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  } ${item.requiresAuth && !isAuthenticated ? 'opacity-60' : ''}`}
                >
                  <div className={`flex items-center justify-center transition-colors ${
                    isActive ? '' : 'group-hover:text-[#1C4633]'
                  }`}>
                    {item.icon}
                  </div>
                  <span className="font-medium">{item.label}</span>
                  {item.requiresAuth && !isAuthenticated && (
                    <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Divider */}
          <div className="px-4 py-2">
            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
          </div>

          {/* Route Types */}
          <nav className="p-4 space-y-1">
            <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Route Types</p>
            {routeTypes.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleItemClick(e, item)}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#1C4633] to-[#1C4633]/90 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className={`flex items-center justify-center transition-colors ${
                    isActive ? '' : `${item.color}`
                  }`}>
                    {item.icon}
                  </div>
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer - Create Route */}
          <div className="mt-auto p-4">
            <div className="bg-gradient-to-br from-[#1C4633]/5 to-[#DA922B]/5 rounded-xl p-4 border border-[#1C4633]/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[#1C4633] to-[#DA922B] rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <span className="font-semibold text-[#1C4633]">Create Route</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">Share your favorite routes with the community</p>
              <div className="flex gap-2">
                <Link
                  href="/routes/create"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors shadow-sm border border-gray-200"
                  onClick={onClose}
                >
                  <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="6" cy="19" r="3" />
                    <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
                    <circle cx="18" cy="5" r="3" />
                  </svg>
                  Trip
                </Link>
                <Link
                  href="/routes/create-hiking"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors shadow-sm border border-gray-200"
                  onClick={onClose}
                >
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Hiking
                </Link>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
