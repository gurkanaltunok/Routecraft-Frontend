'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi, AdminStatsDto } from '@/lib/api/admin';
import Header from '@/app/components/Header';
import AdminSidebar from '@/app/components/AdminSidebar';

// SVG Icons
const UsersIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const ActiveUsersIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    <circle cx="17" cy="17" r="4" fill="#10B981" stroke="#10B981" />
    <path d="M15 17l1.5 1.5 2.5-2.5" stroke="white" strokeWidth={1.5} fill="none" />
  </svg>
);

const VerifiedIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
  </svg>
);

const InactiveIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
);

const RouteIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
  </svg>
);

const TripIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
  </svg>
);

const HikingIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l8.735 8.735m0 0a.374.374 0 11.53.53m-.53-.53l.53.53m0 0L21 21M14.652 9.348a3.75 3.75 0 010 5.304m2.121-7.425a6.75 6.75 0 010 9.546m2.121-11.667c3.808 3.807 3.808 9.98 0 13.788m-9.546-4.242a3.733 3.733 0 01-1.06-2.122m-1.061 4.243a6.75 6.75 0 01-1.625-6.929m-.496 9.05c-3.068-3.067-3.664-7.67-1.79-11.334M12 12h.008v.008H12V12z" />
  </svg>
);

const StarIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
  </svg>
);

const CommentsIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
  </svg>
);

const PendingIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ApprovedIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const RejectedIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const GroupIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
  </svg>
);

const MembersIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const ArrowRightIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

export default function AdminDashboardPage() {
  const { isAuthenticated, isLoading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStatsDto>({
    pendingComments: 0,
    totalUsers: 0,
    totalRoutes: 0,
    totalGroups: 0,
    activeUsers: 0,
    totalComments: 0,
    verifiedUsers: 0,
    inactiveUsers: 0,
    approvedComments: 0,
    rejectedComments: 0,
    tripRoutes: 0,
    hikingRoutes: 0,
    totalRatings: 0,
    averageRating: 0,
    totalGroupMembers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!isAdmin) {
      setError('You do not have permission to access this page.');
      return;
    }

    loadStats();
  }, [isAuthenticated, authLoading, isAdmin, router]);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const statsData = await adminApi.getStats();
      setStats(statsData);
    } catch (err: any) {
      console.error('Error loading stats:', err);
      if (err.status === 403) {
        setError('You do not have permission to access the admin panel.');
      } else {
        setError('Failed to load admin statistics. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
        <Header onSearch={() => {}} />
        <div className="admin-layout">
          <AdminSidebar />
          <div className="admin-content flex items-center justify-center">
            <div className="admin-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
        <Header onSearch={() => {}} />
        <div className="admin-layout">
          <AdminSidebar />
          <div className="admin-content flex items-center justify-center">
            <div className="admin-card p-8 max-w-md text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <RejectedIcon className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => router.push('/')}
                className="admin-btn admin-btn-primary"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      <Header onSearch={() => {}} />
      
      <div className="admin-layout">
        <AdminSidebar />
        
        <main className="admin-content">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
            {/* Page Header */}
            <div className="admin-page-header">
              <h1 className="admin-page-title">Dashboard</h1>
              <p className="admin-page-subtitle">Welcome back! Here&apos;s an overview of your platform.</p>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
              <h2 className="admin-section-title mb-4">Quick Actions</h2>
              <div className="admin-quick-actions">
                <Link href="/admin/comments" className="admin-quick-action">
                  <div className="admin-quick-action-icon bg-amber-100">
                    <PendingIcon className="w-6 h-6 text-amber-600" />
                  </div>
                  <div className="admin-quick-action-text">
                    <h4>Pending Comments</h4>
                    <p>{stats.pendingComments} awaiting review</p>
                  </div>
                  <ArrowRightIcon className="w-5 h-5 text-gray-400" />
                </Link>
                
                <Link href="/admin/users" className="admin-quick-action">
                  <div className="admin-quick-action-icon bg-blue-100">
                    <UsersIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="admin-quick-action-text">
                    <h4>Manage Users</h4>
                    <p>{stats.totalUsers} registered users</p>
                  </div>
                  <ArrowRightIcon className="w-5 h-5 text-gray-400" />
                </Link>
                
                <Link href="/admin/routes" className="admin-quick-action">
                  <div className="admin-quick-action-icon bg-emerald-100">
                    <RouteIcon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="admin-quick-action-text">
                    <h4>Manage Routes</h4>
                    <p>{stats.totalRoutes} total routes</p>
                  </div>
                  <ArrowRightIcon className="w-5 h-5 text-gray-400" />
                </Link>
                
                <Link href="/admin/groups" className="admin-quick-action">
                  <div className="admin-quick-action-icon bg-purple-100">
                    <GroupIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="admin-quick-action-text">
                    <h4>Manage Groups</h4>
                    <p>{stats.totalGroups} active groups</p>
                  </div>
                  <ArrowRightIcon className="w-5 h-5 text-gray-400" />
                </Link>
              </div>
            </div>

            {/* User Statistics */}
            <div className="mb-8">
              <h2 className="admin-section-title mb-4">User Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="admin-stat-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="admin-stat-label">Total Users</p>
                      <p className="admin-stat-value text-[#1C4633]">{stats.totalUsers ?? 0}</p>
                      <p className="admin-stat-sublabel">All registered accounts</p>
                    </div>
                    <div className="admin-stat-icon bg-blue-50">
                      <UsersIcon className="w-7 h-7 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="admin-stat-label">Active Users</p>
                      <p className="admin-stat-value text-emerald-600">{stats.activeUsers ?? 0}</p>
                      <p className="admin-stat-sublabel">{stats.inactiveUsers ?? 0} inactive</p>
                    </div>
                    <div className="admin-stat-icon bg-emerald-50">
                      <ActiveUsersIcon className="w-7 h-7 text-emerald-600" />
                    </div>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="admin-stat-label">Verified Users</p>
                      <p className="admin-stat-value text-blue-600">{stats.verifiedUsers}</p>
                      <p className="admin-stat-sublabel">{stats.totalUsers - stats.verifiedUsers} unverified</p>
                    </div>
                    <div className="admin-stat-icon bg-blue-50">
                      <VerifiedIcon className="w-7 h-7 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="admin-stat-label">Inactive Users</p>
                      <p className="admin-stat-value text-red-600">{stats.inactiveUsers ?? 0}</p>
                      <p className="admin-stat-sublabel">Deactivated accounts</p>
                    </div>
                    <div className="admin-stat-icon bg-red-50">
                      <InactiveIcon className="w-7 h-7 text-red-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Route Statistics */}
            <div className="mb-8">
              <h2 className="admin-section-title mb-4">Route Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="admin-stat-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="admin-stat-label">Total Routes</p>
                      <p className="admin-stat-value text-[#1C4633]">{stats.totalRoutes ?? 0}</p>
                      <p className="admin-stat-sublabel">All published routes</p>
                    </div>
                    <div className="admin-stat-icon bg-emerald-50">
                      <RouteIcon className="w-7 h-7 text-emerald-600" />
                    </div>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="admin-stat-label">Trip Routes</p>
                      <p className="admin-stat-value text-blue-600">{stats.tripRoutes ?? 0}</p>
                      <p className="admin-stat-sublabel">City & travel routes</p>
                    </div>
                    <div className="admin-stat-icon bg-blue-50">
                      <TripIcon className="w-7 h-7 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="admin-stat-label">Hiking Routes</p>
                      <p className="admin-stat-value text-emerald-600">{stats.hikingRoutes ?? 0}</p>
                      <p className="admin-stat-sublabel">Nature & hiking trails</p>
                    </div>
                    <div className="admin-stat-icon bg-emerald-50">
                      <HikingIcon className="w-7 h-7 text-emerald-600" />
                    </div>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="admin-stat-label">Average Rating</p>
                      <p className="admin-stat-value text-amber-600">{(stats.averageRating ?? 0).toFixed(1)}</p>
                      <p className="admin-stat-sublabel">{stats.totalRatings ?? 0} total ratings</p>
                    </div>
                    <div className="admin-stat-icon bg-amber-50">
                      <StarIcon className="w-7 h-7 text-amber-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Comment Statistics */}
            <div className="mb-8">
              <h2 className="admin-section-title mb-4">Comment Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="admin-stat-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="admin-stat-label">Total Comments</p>
                      <p className="admin-stat-value text-[#1C4633]">{stats.totalComments ?? 0}</p>
                      <p className="admin-stat-sublabel">All comments</p>
                    </div>
                    <div className="admin-stat-icon bg-gray-100">
                      <CommentsIcon className="w-7 h-7 text-gray-600" />
                    </div>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="admin-stat-label">Pending</p>
                      <p className="admin-stat-value text-amber-600">{stats.pendingComments ?? 0}</p>
                      <p className="admin-stat-sublabel">Awaiting review</p>
                    </div>
                    <div className="admin-stat-icon bg-amber-50">
                      <PendingIcon className="w-7 h-7 text-amber-600" />
                    </div>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="admin-stat-label">Approved</p>
                      <p className="admin-stat-value text-emerald-600">{stats.approvedComments ?? 0}</p>
                      <p className="admin-stat-sublabel">Published comments</p>
                    </div>
                    <div className="admin-stat-icon bg-emerald-50">
                      <ApprovedIcon className="w-7 h-7 text-emerald-600" />
                    </div>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="admin-stat-label">Rejected</p>
                      <p className="admin-stat-value text-red-600">{stats.rejectedComments ?? 0}</p>
                      <p className="admin-stat-sublabel">Removed comments</p>
                    </div>
                    <div className="admin-stat-icon bg-red-50">
                      <RejectedIcon className="w-7 h-7 text-red-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Group Statistics */}
            <div>
              <h2 className="admin-section-title mb-4">Group Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="admin-stat-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="admin-stat-label">Total Groups</p>
                      <p className="admin-stat-value text-[#1C4633]">{stats.totalGroups ?? 0}</p>
                      <p className="admin-stat-sublabel">Active communities</p>
                    </div>
                    <div className="admin-stat-icon bg-purple-50">
                      <GroupIcon className="w-7 h-7 text-purple-600" />
                    </div>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="admin-stat-label">Total Members</p>
                      <p className="admin-stat-value text-blue-600">{stats.totalGroupMembers ?? 0}</p>
                      <p className="admin-stat-sublabel">
                        {(stats.totalGroups ?? 0) > 0 
                          ? `${((stats.totalGroupMembers ?? 0) / (stats.totalGroups ?? 1)).toFixed(1)} avg per group`
                          : 'No groups yet'}
                      </p>
                    </div>
                    <div className="admin-stat-icon bg-blue-50">
                      <MembersIcon className="w-7 h-7 text-blue-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
