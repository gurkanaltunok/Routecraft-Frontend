'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi, UserManagementDto } from '@/lib/api/admin';
import Header from '@/app/components/Header';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useToast } from '@/contexts/ToastContext';
import { formatLocalDateTime, formatLocalDate } from '@/lib/utils/dateUtils';

// SVG Icons
const CloseIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function AdminUsersPage() {
  const { isAuthenticated, isLoading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserManagementDto[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserManagementDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'verified' | 'unverified'>('all');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserManagementDto | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'created' | 'routes' | 'comments'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !isAdmin) {
      router.push('/login');
      return;
    }

    loadUsers();
  }, [isAuthenticated, authLoading, isAdmin, router, filter]);

  useEffect(() => {
    filterAndSortUsers();
  }, [users, searchQuery, sortBy, sortOrder, filter]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const isActiveFilter = filter === 'active' ? true : filter === 'inactive' ? false : undefined;
      const usersData = await adminApi.getAllUsers(isActiveFilter);
      setUsers(usersData);
    } catch (err: any) {
      console.error('Error loading users:', err);
      if (err.status === 403) {
        setError('You do not have permission to access this page.');
      } else {
        setError('Failed to load users. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortUsers = () => {
    let filtered = [...users];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.userName?.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.userId.toLowerCase().includes(query)
      );
    }

    // Apply status filters
    if (filter === 'verified') {
      filtered = filtered.filter(user => user.emailConfirmed);
    } else if (filter === 'unverified') {
      filtered = filtered.filter(user => !user.emailConfirmed);
    }

    // Sort users
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = (a.userName || '').localeCompare(b.userName || '');
          break;
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'created':
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'routes':
          comparison = a.travelPlanCount - b.travelPlanCount;
          break;
        case 'comments':
          comparison = a.commentCount - b.commentCount;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredUsers(filtered);
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    if (processingIds.has(userId)) return;

    try {
      setProcessingIds(prev => new Set(prev).add(userId));
      await adminApi.updateUserStatus(userId, !currentStatus);
      showToast(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`, 'success');
      loadUsers();
    } catch (err: any) {
      console.error('Error updating user status:', err);
      showToast('Failed to update user status', 'error');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleUserClick = (user: UserManagementDto) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return formatLocalDateTime(dateString);
  };

  const formatDateShort = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return formatLocalDate(dateString);
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const activeUsers = users.filter(u => u.isActive).length;
  const inactiveUsers = users.filter(u => !u.isActive).length;
  const verifiedUsers = users.filter(u => u.emailConfirmed).length;
  const unverifiedUsers = users.filter(u => !u.emailConfirmed).length;
  const totalRoutes = users.reduce((sum, u) => sum + u.travelPlanCount, 0);
  const totalComments = users.reduce((sum, u) => sum + u.commentCount, 0);

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
                <svg className="w-8 h-8 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Error</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => router.push('/admin')}
                className="admin-btn admin-btn-primary"
              >
                Back to Admin Panel
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
              <h1 className="admin-page-title">User Management</h1>
              <p className="admin-page-subtitle">Manage users, view statistics, and control account status</p>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <div className="admin-stat-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="admin-stat-label">Total Users</p>
                    <p className="admin-stat-value text-[#1C4633]">{users.length}</p>
                    <p className="admin-stat-sublabel">All registered users</p>
                  </div>
                  <div className="admin-stat-icon bg-blue-50">
                    <svg className="w-7 h-7 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="admin-stat-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="admin-stat-label">Active Users</p>
                    <p className="admin-stat-value text-emerald-600">{activeUsers}</p>
                    <p className="admin-stat-sublabel">{inactiveUsers} inactive</p>
                  </div>
                  <div className="admin-stat-icon bg-emerald-50">
                    <svg className="w-7 h-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="admin-stat-label">Verified</p>
                    <p className="admin-stat-value text-blue-600">{verifiedUsers}</p>
                    <p className="admin-stat-sublabel">{unverifiedUsers} unverified</p>
                  </div>
                  <div className="admin-stat-icon bg-blue-50">
                    <svg className="w-7 h-7 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="admin-stat-label">Total Activity</p>
                    <p className="admin-stat-value text-amber-600">{totalRoutes + totalComments}</p>
                    <p className="admin-stat-sublabel">{totalRoutes} routes, {totalComments} comments</p>
                  </div>
                  <div className="admin-stat-icon bg-amber-50">
                    <svg className="w-7 h-7 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="admin-card p-5 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by name, email, or user ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="admin-search-input"
                  />
                </div>
                <div className="admin-filter-tabs">
                  <button onClick={() => setFilter('all')} className={`admin-filter-tab ${filter === 'all' ? 'active' : ''}`}>All</button>
                  <button onClick={() => setFilter('active')} className={`admin-filter-tab ${filter === 'active' ? 'active' : ''}`}>Active</button>
                  <button onClick={() => setFilter('inactive')} className={`admin-filter-tab ${filter === 'inactive' ? 'active' : ''}`}>Inactive</button>
                  <button onClick={() => setFilter('verified')} className={`admin-filter-tab ${filter === 'verified' ? 'active' : ''}`}>Verified</button>
                  <button onClick={() => setFilter('unverified')} className={`admin-filter-tab ${filter === 'unverified' ? 'active' : ''}`}>Unverified</button>
                </div>
              </div>
            </div>

            {/* Results Count */}
            <div className="mb-4 text-sm text-gray-500 font-medium">
              Showing {filteredUsers.length} of {users.length} users
            </div>

            {/* Users Table */}
            <div className="admin-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="admin-table">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      User
                      {sortBy === 'name' && (
                        <svg className={`w-4 h-4 ${sortOrder === 'asc' ? '' : 'transform rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email Status
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('routes')}
                  >
                    <div className="flex items-center gap-2">
                      Routes
                      {sortBy === 'routes' && (
                        <svg className={`w-4 h-4 ${sortOrder === 'asc' ? '' : 'transform rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('comments')}
                  >
                    <div className="flex items-center gap-2">
                      Comments
                      {sortBy === 'comments' && (
                        <svg className={`w-4 h-4 ${sortOrder === 'asc' ? '' : 'transform rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('created')}
                  >
                    <div className="flex items-center gap-2">
                      Created
                      {sortBy === 'created' && (
                        <svg className={`w-4 h-4 ${sortOrder === 'asc' ? '' : 'transform rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr 
                      key={user.userId} 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleUserClick(user)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-[#1C4633] flex items-center justify-center text-white font-semibold mr-3">
                            {user.userName?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.userName || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            <div className="text-xs text-gray-400 mt-1">ID: {user.userId.substring(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.emailConfirmed ? (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Verified
                          </span>
                        ) : (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Unverified
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                          <span className="text-sm font-medium text-gray-900">{user.travelPlanCount}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          <span className="text-sm font-medium text-gray-900">{user.commentCount}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateShort(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.isActive ? (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleStatus(user.userId, user.isActive)}
                          disabled={processingIds.has(user.userId)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            user.isActive
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {processingIds.has(user.userId) ? (
                            'Processing...'
                          ) : user.isActive ? (
                            'Deactivate'
                          ) : (
                            'Activate'
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowUserModal(false)}
        >
          <div 
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#1C4633]">User Details</h2>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-[#1C4633] flex items-center justify-center text-white font-bold text-2xl">
                  {selectedUser.userName?.charAt(0).toUpperCase() || selectedUser.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{selectedUser.userName || 'N/A'}</h3>
                  <p className="text-gray-600">{selectedUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">User ID</p>
                  <p className="text-sm font-mono text-gray-900 break-all">{selectedUser.userId}</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Account Status</p>
                  {selectedUser.isActive ? (
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Inactive
                    </span>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Email Verification</p>
                  {selectedUser.emailConfirmed ? (
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Verified
                    </span>
                  ) : (
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Unverified
                    </span>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Account Created</p>
                  <p className="text-sm text-gray-900">{formatDate(selectedUser.createdAt)}</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Activity Statistics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{selectedUser.travelPlanCount}</p>
                        <p className="text-sm text-gray-600">Travel Routes</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <div>
                        <p className="text-2xl font-bold text-orange-600">{selectedUser.commentCount}</p>
                        <p className="text-sm text-gray-600">Comments</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 mt-6 flex gap-4">
                <Link
                  href={`/profile/${selectedUser.userId}`}
                  className="flex-1 px-4 py-2 bg-[#1C4633] text-white rounded-lg hover:bg-[#2d5a47] transition-colors text-center font-medium"
                >
                  View Profile
                </Link>
                <button
                  onClick={() => {
                    handleToggleStatus(selectedUser.userId, selectedUser.isActive);
                    setShowUserModal(false);
                  }}
                  disabled={processingIds.has(selectedUser.userId)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedUser.isActive
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {selectedUser.isActive ? 'Deactivate User' : 'Activate User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}