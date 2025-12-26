'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi, PendingCommentDto } from '@/lib/api/admin';
import Header from '@/app/components/Header';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useToast } from '@/contexts/ToastContext';

export default function AdminCommentsPage() {
  const { isAuthenticated, isLoading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [pendingComments, setPendingComments] = useState<PendingCommentDto[]>([]);
  const [allComments, setAllComments] = useState<PendingCommentDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [commentTypeFilter, setCommentTypeFilter] = useState<string>('all');
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [banningUserIds, setBanningUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !isAdmin) {
      router.push('/login');
      return;
    }

    if (activeTab === 'pending') {
      loadPendingComments();
    } else {
      loadAllComments();
    }
  }, [isAuthenticated, authLoading, isAdmin, router, activeTab, statusFilter, commentTypeFilter]);

  const loadPendingComments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const comments = await adminApi.getPendingComments();
      setPendingComments(comments);
    } catch (err: any) {
      console.error('Error loading pending comments:', err);
      if (err.status === 403) {
          setError('Failed to load pending comments. Please try again.');
      } else {
        setError('Failed to load pending comments. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllComments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const status = statusFilter === 'all' ? undefined : statusFilter;
      const commentType = commentTypeFilter === 'all' ? undefined : commentTypeFilter;
      const comments = await adminApi.getAllComments(status, commentType);
      setAllComments(comments);
    } catch (err: any) {
      console.error('Error loading all comments:', err);
      if (err.status === 403) {
        setError('You do not have permission to access this page.');
      } else {
        setError('Failed to load comments. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (comment: PendingCommentDto) => {
    if (processingIds.has(comment.commentID)) return;

    try {
      setProcessingIds(prev => new Set(prev).add(comment.commentID));
      await adminApi.approveComment(comment.commentID, comment.commentType);
      showToast('Comment approved and published successfully', 'success');
      if (activeTab === 'pending') {
        loadPendingComments();
      } else {
        loadAllComments();
      }
    } catch (err: any) {
      console.error('Error approving comment:', err);
      showToast('Failed to approve comment', 'error');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(comment.commentID);
        return newSet;
      });
    }
  };

  const handleReject = async (comment: PendingCommentDto) => {
    if (processingIds.has(comment.commentID)) return;

    if (!confirm('Are you sure you want to delete this comment? It will be removed and not published.')) {
      return;
    }

    try {
      setProcessingIds(prev => new Set(prev).add(comment.commentID));
      await adminApi.rejectComment(comment.commentID, comment.commentType);
      showToast('Comment deleted successfully', 'success');
      if (activeTab === 'pending') {
        loadPendingComments();
      } else {
        loadAllComments();
      }
    } catch (err: any) {
      console.error('Error rejecting comment:', err);
      showToast('Failed to delete comment', 'error');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(comment.commentID);
        return newSet;
      });
    }
  };

  const handleBanUser = async (userId: string, userName: string) => {
    if (banningUserIds.has(userId)) return;

    if (!confirm(`Are you sure you want to ban user "${userName}"? Their account will be deactivated.`)) {
      return;
    }

    try {
      setBanningUserIds(prev => new Set(prev).add(userId));
      await adminApi.updateUserStatus(userId, false);
      showToast(`User "${userName}" has been banned`, 'success');
      if (activeTab === 'pending') {
        loadPendingComments();
      } else {
        loadAllComments();
      }
    } catch (err: any) {
      console.error('Error banning user:', err);
      showToast('Failed to ban user', 'error');
    } finally {
      setBanningUserIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const getToxicityColor = (score: number | null) => {
    if (score === null) return 'bg-gray-100 text-gray-800';
    if (score >= 0.7) return 'bg-red-100 text-red-800';
    if (score >= 0.5) return 'bg-orange-100 text-orange-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getToxicityLabel = (score: number | null) => {
    if (score === null) return 'N/A';
    if (score >= 0.7) return 'High';
    if (score >= 0.5) return 'Medium';
    return 'Low';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Istanbul' // GMT+2
    });
  };

  const comments = activeTab === 'pending' ? pendingComments : allComments;

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
              <h1 className="admin-page-title">Comment Control</h1>
              <p className="admin-page-subtitle">Moderate and manage user comments</p>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <div className="admin-stat-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="admin-stat-label">Pending Comments</p>
                    <p className="admin-stat-value text-amber-600">{pendingComments.length}</p>
                    <p className="admin-stat-sublabel">Awaiting review</p>
                  </div>
                  <div className="admin-stat-icon bg-amber-50">
                    <svg className="w-7 h-7 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="admin-stat-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="admin-stat-label">Approved</p>
                    <p className="admin-stat-value text-emerald-600">
                      {allComments.filter(c => c.status === 'Approved').length}
                    </p>
                    <p className="admin-stat-sublabel">Published comments</p>
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
                    <p className="admin-stat-label">Rejected</p>
                    <p className="admin-stat-value text-red-600">
                      {allComments.filter(c => c.status === 'Rejected').length}
                    </p>
                    <p className="admin-stat-sublabel">Removed comments</p>
                  </div>
                  <div className="admin-stat-icon bg-red-50">
                    <svg className="w-7 h-7 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs & Filters */}
            <div className="admin-card p-5 mb-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="admin-filter-tabs">
                  <button
                    onClick={() => setActiveTab('pending')}
                    className={`admin-filter-tab ${activeTab === 'pending' ? 'active' : ''}`}
                  >
                    Pending
                    {pendingComments.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                        {pendingComments.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`admin-filter-tab ${activeTab === 'all' ? 'active' : ''}`}
                  >
                    All Comments
                  </button>
                </div>

                {activeTab === 'all' && (
                  <div className="flex gap-3 ml-auto">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="admin-select"
                    >
                      <option value="all">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                    <select
                      value={commentTypeFilter}
                      onChange={(e) => setCommentTypeFilter(e.target.value)}
                      className="admin-select"
                    >
                      <option value="all">All Types</option>
                      <option value="TravelPlan">Travel Plan</option>
                      <option value="Group">Group</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Results Count */}
            <div className="mb-4 text-sm text-gray-500 font-medium">
              Showing {comments.length} {activeTab === 'pending' ? 'pending' : ''} comments
            </div>

            {/* Comments Table */}
            <div className="admin-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="admin-table" style={{ minWidth: '1400px' }}>
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '300px', width: '30%' }}>
                        Comment
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '150px' }}>
                        Author
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '150px' }}>
                        Related To
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '100px' }}>
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '100px' }}>
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '120px' }}>
                        Toxicity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '150px' }}>
                        Date
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" style={{ minWidth: '160px', width: '160px' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {comments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                          {activeTab === 'pending' 
                            ? 'All comments have been reviewed.' 
                            : 'No comments match the selected filters.'}
                        </td>
                      </tr>
                    ) : (
                      comments.map((comment) => (
                        <tr 
                          key={`${comment.commentType}-${comment.commentID}`} 
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-4" style={{ minWidth: '300px', width: '30%' }}>
                            <div>
                              <p className="text-sm text-gray-900 break-words">{comment.text}</p>
                              <div className="text-xs text-gray-400 mt-1">ID: {comment.commentID}</div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap" style={{ minWidth: '150px' }}>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-[#1C4633] flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                                {(comment.authorName || comment.authorEmail || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">{comment.authorName || 'Unknown'}</div>
                                <div className="text-xs text-gray-500 truncate">{comment.authorEmail || 'N/A'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4" style={{ minWidth: '150px' }}>
                            <div className="text-sm text-gray-900 truncate" title={comment.relatedEntityTitle || 'N/A (Deleted)'}>
                              {comment.relatedEntityTitle || 'N/A (Deleted)'}
                            </div>
                            <div className="text-xs text-gray-400">ID: {comment.relatedEntityID}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap" style={{ minWidth: '100px' }}>
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              comment.commentType === 'TravelPlan' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {comment.commentType}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap" style={{ minWidth: '100px' }}>
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(comment.status)}`}>
                              {comment.status || 'Pending'}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap" style={{ minWidth: '120px' }}>
                            {comment.toxicityScore !== null ? (
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getToxicityColor(comment.toxicityScore)}`}>
                                {getToxicityLabel(comment.toxicityScore)} ({comment.toxicityScore.toFixed(2)})
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500" style={{ minWidth: '150px' }}>
                            {formatDate(comment.timestamp)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium bg-white" style={{ minWidth: '160px', width: '160px' }}>
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              {(comment.status === 'Pending' || !comment.status || comment.status === '0') && (
                                <>
                                  <button
                                    onClick={() => handleApprove(comment)}
                                    disabled={processingIds.has(comment.commentID)}
                                    className="p-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center font-medium shadow-sm"
                                    title="Approve and publish comment"
                                  >
                                    {processingIds.has(comment.commentID) ? (
                                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                    ) : (
                                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleReject(comment)}
                                    disabled={processingIds.has(comment.commentID)}
                                    className="p-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center font-medium shadow-sm"
                                    title="Delete comment"
                                  >
                                    {processingIds.has(comment.commentID) ? (
                                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                    ) : (
                                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleBanUser(comment.authorID, comment.authorName || comment.authorEmail || 'User')}
                                    disabled={banningUserIds.has(comment.authorID)}
                                    className="p-2 bg-orange-600 text-white hover:bg-orange-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center font-medium shadow-sm"
                                    title="Ban user"
                                  >
                                    {banningUserIds.has(comment.authorID) ? (
                                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                    ) : (
                                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                      </svg>
                                    )}
                                  </button>
                                </>
                              )}
                              {comment.status === 'Approved' && (
                                <>
                                  <button
                                    onClick={() => handleReject(comment)}
                                    disabled={processingIds.has(comment.commentID)}
                                    className="p-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center font-medium shadow-sm"
                                    title="Delete comment"
                                  >
                                    {processingIds.has(comment.commentID) ? (
                                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                    ) : (
                                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleBanUser(comment.authorID, comment.authorName || comment.authorEmail || 'User')}
                                    disabled={banningUserIds.has(comment.authorID)}
                                    className="p-2 bg-orange-600 text-white hover:bg-orange-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center font-medium shadow-sm"
                                    title="Ban user"
                                  >
                                    {banningUserIds.has(comment.authorID) ? (
                                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                    ) : (
                                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                      </svg>
                                    )}
                                  </button>
                                </>
                              )}
                              {comment.status === 'Rejected' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(comment)}
                                    disabled={processingIds.has(comment.commentID)}
                                    className="p-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center font-medium shadow-sm"
                                    title="Approve and publish comment"
                                  >
                                    {processingIds.has(comment.commentID) ? (
                                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                    ) : (
                                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </button>
                                </>
                              )}
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
