'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { groupsApi, GroupDto } from '@/lib/api/groups';
import Header from '@/app/components/Header';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useToast } from '@/contexts/ToastContext';

export default function AdminGroupsPage() {
  const { isAuthenticated, isLoading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [groups, setGroups] = useState<GroupDto[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<GroupDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'creator' | 'members' | 'visibility'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !isAdmin) {
      router.push('/login');
      return;
    }

    loadGroups();
  }, [isAuthenticated, authLoading, isAdmin, router]);

  const loadGroups = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const groupsData = await groupsApi.getAll();
      setGroups(groupsData);
      setFilteredGroups(groupsData);
    } catch (err: any) {
      console.error('Error loading groups:', err);
      if (err.status === 403 || err.status === 401) {
        setError('You do not have permission to access this page.');
      } else {
        setError('Failed to load groups. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    filterAndSortGroups();
  }, [searchQuery, groups, sortBy, sortOrder]);

  const filterAndSortGroups = () => {
    let filtered = [...groups];

    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (group) =>
          group.name.toLowerCase().includes(query) ||
          group.description?.toLowerCase().includes(query) ||
          group.creatorName?.toLowerCase().includes(query)
      );
    }

    // Sort groups
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'creator':
          comparison = (a.creatorName || '').localeCompare(b.creatorName || '');
          break;
        case 'members':
          comparison = a.memberCount - b.memberCount;
          break;
        case 'visibility':
          comparison = (a.isPublic ? 1 : 0) - (b.isPublic ? 1 : 0);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredGroups(filtered);
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleDeleteGroup = async (groupId: number, groupName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete the group "${groupName}"? This action cannot be undone.`)) {
      return;
    }

    if (processingIds.has(groupId)) return;

    try {
      setProcessingIds(prev => new Set(prev).add(groupId));
      await groupsApi.delete(groupId);
      showToast(`Group "${groupName}" deleted successfully`, 'success');
      loadGroups();
    } catch (err: any) {
      console.error('Error deleting group:', err);
      showToast('Failed to delete group', 'error');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupId);
        return newSet;
      });
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
              <h1 className="admin-page-title">Group Control</h1>
              <p className="admin-page-subtitle">Manage activity groups and monitor group activity</p>
            </div>

            {/* Search */}
            <div className="admin-card p-5 mb-6">
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Search groups by name, description or creator..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="admin-search-input"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="text-sm text-gray-500 mt-3">
                  Found {filteredGroups.length} of {groups.length} groups
                </p>
              )}
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
              <div className="admin-stat-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="admin-stat-label">Total Groups</p>
                    <p className="admin-stat-value text-purple-600">{groups.length}</p>
                    <p className="admin-stat-sublabel">Active communities</p>
                  </div>
                  <div className="admin-stat-icon bg-purple-50">
                    <svg className="w-7 h-7 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="admin-stat-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="admin-stat-label">Total Members</p>
                    <p className="admin-stat-value text-blue-600">
                      {groups.reduce((sum, group) => sum + (group.memberCount || 0), 0)}
                    </p>
                    <p className="admin-stat-sublabel">
                      {groups.length > 0 ? `${(groups.reduce((sum, group) => sum + (group.memberCount || 0), 0) / groups.length).toFixed(1)} avg per group` : 'No groups'}
                    </p>
                  </div>
                  <div className="admin-stat-icon bg-blue-50">
                    <svg className="w-7 h-7 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Count */}
            <div className="mb-4 text-sm text-gray-500 font-medium">
              Showing {filteredGroups.length} of {groups.length} groups
            </div>

            {/* Groups Table */}
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
                          Group
                          {sortBy === 'name' && (
                            <svg className={`w-4 h-4 ${sortOrder === 'asc' ? '' : 'transform rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('creator')}
                      >
                        <div className="flex items-center gap-2">
                          Creator
                          {sortBy === 'creator' && (
                            <svg className={`w-4 h-4 ${sortOrder === 'asc' ? '' : 'transform rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('visibility')}
                      >
                        <div className="flex items-center gap-2">
                          Visibility
                          {sortBy === 'visibility' && (
                            <svg className={`w-4 h-4 ${sortOrder === 'asc' ? '' : 'transform rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('members')}
                      >
                        <div className="flex items-center gap-2">
                          Members
                          {sortBy === 'members' && (
                            <svg className={`w-4 h-4 ${sortOrder === 'asc' ? '' : 'transform rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredGroups.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          {searchQuery ? 'No groups found' : 'No groups yet'}
                        </td>
                      </tr>
                    ) : (
                      filteredGroups.map((group) => (
                        <tr 
                          key={group.groupID} 
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <Link href={`/groups/${group.groupID}`} className="flex items-center group">
                              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mr-3 group-hover:bg-purple-200 transition-colors">
                                <svg
                                  className="w-5 h-5 text-purple-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                  />
                                </svg>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 group-hover:text-[#DA922B] transition-colors">
                                  {group.name}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                  {group.description || 'No description'}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">ID: {group.groupID}</div>
                              </div>
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{group.creatorName || 'Unknown'}</div>
                            <div className="text-xs text-gray-500">{group.creatorId.substring(0, 8)}...</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {group.isPublic ? (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Public
                              </span>
                            ) : (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                Private
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                              <span className="text-sm font-medium text-gray-900">{group.memberCount}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/groups/${group.groupID}`}
                                className="px-3 py-1.5 text-[#1C4633] hover:bg-[#1C4633]/10 rounded-lg transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View
                              </Link>
                              <button
                                onClick={(e) => handleDeleteGroup(group.groupID, group.name, e)}
                                disabled={processingIds.has(group.groupID)}
                                className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {processingIds.has(group.groupID) ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
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
    </div>
  );
}
