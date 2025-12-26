'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { followApi, UserProfileSummaryDto } from '@/lib/api/follow';
import { travelPlansApi, ActivityFeedItemDto, ActivityType } from '@/lib/api/travelPlans';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import Header from '@/app/components/Header';
import Sidebar from '@/app/components/Sidebar';
import { getRelativeTime } from '@/lib/utils/dateUtils';

const getImageUrl = (imageUrl?: string | null) => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${process.env.NEXT_PUBLIC_API_URL || 'https://routecraft.duckdns.org'}${imageUrl}`;
};

export default function DiscoverPage() {
  const router = useRouter();
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // User search state
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserProfileSummaryDto[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Feed state
  const [activities, setActivities] = useState<ActivityFeedItemDto[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const take = 20;

  const loadFeed = useCallback(async (currentSkip: number = 0) => {
    if (!isAuthenticated) {
      console.log('[Feed] Not authenticated, skipping feed load');
      return;
    }

    console.log('[Feed] Loading feed, skip:', currentSkip);
    setIsLoadingFeed(true);
    try {
      const feedItems = await travelPlansApi.getActivityFeed(currentSkip, take);
      console.log('[Feed] Received items:', feedItems.length, feedItems);
      if (feedItems.length < take) {
        setHasMore(false);
      }
      if (currentSkip === 0) {
        setActivities(feedItems);
      } else {
        setActivities((prev) => [...prev, ...feedItems]);
      }
    } catch (error: any) {
      console.error('[Feed] Error loading feed:', error);
      // Don't show error toast for 401 - user might not be authenticated
      if (error?.status !== 401) {
        showToast('An error occurred while loading feed', 'error');
      }
    } finally {
      setIsLoadingFeed(false);
    }
  }, [isAuthenticated, showToast]);

  const searchUsers = useCallback(async (term: string) => {
    if (term.trim().length < 2) return;

    setIsLoadingUsers(true);
    setError(null);
    try {
      const results = await followApi.searchUsers(term.trim());
      setUsers(results);
      if (results.length === 0) {
        setError('No users found matching your search.');
      }
    } catch (error: any) {
      console.error('Error searching users:', error);
      const errorMessage = error?.message || 'Failed to search users. Please try again.';
      setError(errorMessage);
      // Don't show toast for anonymous users searching
      if (isAuthenticated) {
        showToast(errorMessage, 'error');
      }
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [isAuthenticated, showToast]);

  // Load feed when authenticated
  useEffect(() => {
    const fetchFeed = async () => {
      if (!isAuthenticated || authLoading) {
        console.log('[Feed] Skipping - authLoading:', authLoading, 'isAuthenticated:', isAuthenticated);
        if (!authLoading && !isAuthenticated) {
          setIsLoadingFeed(false);
        }
        return;
      }
      
      console.log('[Feed] Starting feed load...');
      setIsLoadingFeed(true);
      try {
        const feedItems = await travelPlansApi.getActivityFeed(0, take);
        console.log('[Feed] Received items:', feedItems.length, feedItems);
        if (feedItems.length < take) {
          setHasMore(false);
        }
        setActivities(feedItems);
      } catch (error: any) {
        console.error('[Feed] Error loading feed:', error);
        if (error?.status !== 401) {
          showToast('An error occurred while loading feed', 'error');
        }
      } finally {
        setIsLoadingFeed(false);
      }
    };

    fetchFeed();
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    // Debounce search
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (searchTerm.trim().length >= 2) {
      const timeout = setTimeout(() => {
        searchUsers(searchTerm);
      }, 300);
      setSearchTimeout(timeout);
    } else {
      setUsers([]);
      setError(null);
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTerm, isAuthenticated, searchUsers]);

  const loadMore = () => {
    if (!isLoadingFeed && hasMore) {
      const newSkip = skip + take;
      setSkip(newSkip);
      loadFeed(newSkip);
    }
  };

  useEffect(() => {
    if (skip > 0 && !isLoadingFeed) {
      loadFeed(skip);
    }
  }, [skip, loadFeed, isLoadingFeed]);

  const handleUserClick = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  const handleSearch = (query: string) => {
    setSearchTerm(query);
  };

  // Helper function to get activity description and icon
  const getActivityInfo = (activity: ActivityFeedItemDto) => {
    switch (activity.type) {
      case ActivityType.NewRoute:
        return {
          icon: (
            <svg className="w-5 h-5 text-[#1C4633]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          ),
          text: 'shared a new route',
          color: 'bg-[#1C4633]/10'
        };
      case ActivityType.Comment:
        return {
          icon: (
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          ),
          text: 'commented on a route',
          color: 'bg-blue-100'
        };
      case ActivityType.Rating:
        return {
          icon: (
            <svg className="w-5 h-5 text-[#DA922B]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ),
          text: `rated a route ${activity.ratingStars} stars`,
          color: 'bg-[#DA922B]/10'
        };
      case ActivityType.Favorite:
        return {
          icon: (
            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          ),
          text: 'favorited a route',
          color: 'bg-red-100'
        };
      case ActivityType.Follow:
        return {
          icon: (
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          ),
          text: `started following ${activity.targetUserName}`,
          color: 'bg-purple-100'
        };
      default:
        return {
          icon: null,
          text: 'did something',
          color: 'bg-gray-100'
        };
    }
  };

  // Route type names
  const getRouteTypeName = (type: number | null | undefined) => {
    switch (type) {
      case 1: return 'Hiking';
      case 2: return 'Biking';
      case 3: return 'Road Trip';
      case 4: return 'Walking';
      default: return 'Route';
    }
  };



  return (
    <div className="min-h-screen bg-[#F4F4F2] flex flex-col">
      <Header onSearch={handleSearch} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 lg:ml-64 transition-all duration-300 overflow-y-auto" style={{ minHeight: 'calc(100vh - 4rem)' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-[#1C4633] mb-2">Discover</h1>
              <p className="text-gray-600">Find users and explore activities from people you follow</p>
            </div>

            {/* Discover Users Section */}
            <div className="bg-white rounded-xl shadow-lg border border-[#1C4633]/20 p-6 mb-8">
              <h2 className="text-xl font-semibold text-[#1C4633] mb-4">Discover Users</h2>
              
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by username or email..."
                    className="w-full px-4 py-3 pl-12 border border-[#1C4633]/30 rounded-lg focus:ring-2 focus:ring-[#1C4633]/20 focus:border-[#1C4633] outline-none transition-all text-gray-900 placeholder-gray-400"
                    autoFocus
                  />
                  <svg
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  {isLoadingUsers && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1C4633]"></div>
                    </div>
                  )}
                </div>
                {searchTerm.trim().length > 0 && searchTerm.trim().length < 2 && (
                  <p className="text-sm text-gray-500 mt-2 px-1">
                    Enter at least 2 characters to search
                  </p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-red-600">{error}</p>
                  </div>
                </div>
              )}

              {/* User Results */}
              {searchTerm.trim().length >= 2 && (
                <div>
                  {isLoadingUsers ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C4633]"></div>
                      <p className="mt-4 text-gray-600">Searching users...</p>
                    </div>
                  ) : users.length === 0 && !error ? (
                    <div className="text-center py-8">
                      <svg
                        className="w-16 h-16 text-gray-300 mx-auto mb-4"
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
                      <p className="text-gray-500 text-lg font-medium">No users found</p>
                      <p className="text-sm text-gray-400 mt-2">Try a different search term</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {users.map((user) => (
                        <div
                          key={user.userId}
                          className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200"
                          onClick={() => handleUserClick(user.userId)}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-white shadow-sm ${
                              getImageUrl(user.profileImageUrl) ? 'bg-white' : 'bg-gradient-to-br from-[#1C4633] to-[#DA922B]'
                            }`}>
                              {getImageUrl(user.profileImageUrl) ? (
                                <img
                                  src={getImageUrl(user.profileImageUrl)!}
                                  alt={user.userName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-white font-bold text-lg">
                                  {user.userName?.[0]?.toUpperCase() || 'U'}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-[#1C4633] truncate">{user.userName || 'Unknown User'}</p>
                                {user.isFollowing && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-[#1C4633]/10 text-[#1C4633] rounded-full">
                                    Following
                                  </span>
                                )}
                              </div>
                              {user.email && (
                                <p className="text-sm text-gray-500 truncate mb-2">{user.email}</p>
                              )}
                              <div className="flex gap-4 text-xs text-gray-500">
                                <span>{user.followerCount} followers</span>
                                <span>{user.travelPlanCount} routes</span>
                              </div>
                            </div>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {searchTerm.trim().length < 2 && (
                <div className="text-center py-6">
                  <svg
                    className="w-12 h-12 text-gray-300 mx-auto mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <p className="text-gray-500 text-sm">Enter at least 2 characters to search for users</p>
                </div>
              )}
            </div>

            {/* Feed Section - Only show for authenticated users */}
            {isAuthenticated && (
              <div className="bg-white rounded-xl shadow-lg border border-[#1C4633]/20 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-[#1C4633]">Activity Feed</h2>
                  <button
                    onClick={() => {
                      setSkip(0);
                      setHasMore(true);
                      loadFeed(0);
                    }}
                    disabled={isLoadingFeed}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#1C4633] hover:bg-[#1C4633]/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Refresh feed"
                  >
                    <svg 
                      className={`w-4 h-4 ${isLoadingFeed ? 'animate-spin' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
                
                {isLoadingFeed && activities.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#1C4633]"></div>
                  <p className="mt-4 text-gray-600">Loading activities...</p>
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="w-16 h-16 text-gray-300 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                    />
                  </svg>
                  <p className="text-gray-500 text-lg font-medium mb-2">Your feed is empty</p>
                  <p className="text-sm text-gray-400 mb-2">
                    When you follow other users, you'll see their activities here:
                  </p>
                  <div className="text-left max-w-xs mx-auto mb-6 space-y-1">
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <span className="w-2 h-2 bg-[#1C4633] rounded-full"></span>
                      New routes they share
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Comments they leave
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <span className="w-2 h-2 bg-[#DA922B] rounded-full"></span>
                      Ratings they give
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      Routes they favorite
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      Users they follow
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const searchInput = document.querySelector('input[placeholder*="Search by username"]') as HTMLInputElement;
                      if (searchInput) {
                        searchInput.focus();
                        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                    className="px-6 py-2 bg-[#1C4633] text-white rounded-lg hover:bg-[#1C4633]/90 transition-colors"
                  >
                    Find Users to Follow
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {activities.map((activity, index) => {
                      const activityInfo = getActivityInfo(activity);
                      return (
                        <div
                          key={`${activity.type}-${activity.activityId}-${index}`}
                          className="bg-gray-50 rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all"
                        >
                          {/* Activity Header */}
                          <div className="flex items-start gap-3">
                            {/* Actor Avatar */}
                            <Link href={`/profile/${activity.actorId}`} className="flex-shrink-0">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-white shadow-sm ${
                                getImageUrl(activity.actorImageUrl) ? 'bg-white' : 'bg-gradient-to-br from-[#1C4633] to-[#DA922B]'
                              }`}>
                                {getImageUrl(activity.actorImageUrl) ? (
                                  <img src={getImageUrl(activity.actorImageUrl)!} alt={activity.actorName} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-white font-bold">
                                    {activity.actorName?.[0]?.toUpperCase() || 'U'}
                                  </span>
                                )}
                              </div>
                            </Link>

                            {/* Activity Content */}
                            <div className="flex-1 min-w-0">
                              {/* Activity Info */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <Link
                                  href={`/profile/${activity.actorId}`}
                                  className="font-semibold text-[#1C4633] hover:underline"
                                >
                                  {activity.actorName}
                                </Link>
                                <span className="text-gray-600 text-sm">{activityInfo.text}</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">{getRelativeTime(activity.timestamp)}</p>

                              {/* Activity Details based on type */}
                              {(activity.type === ActivityType.NewRoute || 
                                activity.type === ActivityType.Comment || 
                                activity.type === ActivityType.Rating || 
                                activity.type === ActivityType.Favorite) && activity.travelPlanId && (
                                <Link 
                                  href={`/routes/${activity.travelPlanId}`}
                                  className="mt-3 block bg-white rounded-lg border border-gray-200 p-3 hover:border-[#1C4633]/40 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    {/* Route Cover */}
                                    <div className="w-16 h-16 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                                      {activity.travelPlanCoverImageUrl ? (
                                        <img 
                                          src={activity.travelPlanCoverImageUrl} 
                                          alt={activity.travelPlanTitle || 'Route'} 
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-[#1C4633]/10">
                                          <svg className="w-8 h-8 text-[#1C4633]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                          </svg>
                                        </div>
                                      )}
                                    </div>
                                    {/* Route Info */}
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-gray-900 truncate">{activity.travelPlanTitle}</p>
                                      <p className="text-xs text-gray-500">{getRouteTypeName(activity.travelPlanType)}</p>
                                      {activity.type === ActivityType.Comment && activity.commentText && (
                                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">"{activity.commentText}"</p>
                                      )}
                                      {activity.type === ActivityType.Rating && activity.ratingStars && (
                                        <div className="flex items-center gap-1 mt-1">
                                          {[1, 2, 3, 4, 5].map((star) => (
                                            <svg
                                              key={star}
                                              className={`w-4 h-4 ${star <= activity.ratingStars! ? 'text-[#DA922B]' : 'text-gray-300'}`}
                                              fill="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                            </svg>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </div>
                                </Link>
                              )}

                              {/* Follow Activity - Show target user */}
                              {activity.type === ActivityType.Follow && activity.targetUserId && (
                                <Link 
                                  href={`/profile/${activity.targetUserId}`}
                                  className="mt-3 block bg-white rounded-lg border border-gray-200 p-3 hover:border-[#1C4633]/40 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-white shadow-sm ${
                                      getImageUrl(activity.targetUserImageUrl) ? 'bg-white' : 'bg-gradient-to-br from-[#1C4633] to-[#DA922B]'
                                    }`}>
                                      {getImageUrl(activity.targetUserImageUrl) ? (
                                        <img src={getImageUrl(activity.targetUserImageUrl)!} alt={activity.targetUserName || 'User'} className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="text-white font-bold text-sm">
                                          {activity.targetUserName?.[0]?.toUpperCase() || 'U'}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-gray-900">{activity.targetUserName}</p>
                                      <p className="text-xs text-gray-500">View profile</p>
                                    </div>
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </div>
                                </Link>
                              )}
                            </div>

                            {/* Activity Type Icon */}
                            <div className={`w-10 h-10 rounded-full ${activityInfo.color} flex items-center justify-center flex-shrink-0`}>
                              {activityInfo.icon}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Load More */}
                  {hasMore && (
                    <div className="text-center mt-8">
                      <button
                        onClick={loadMore}
                        disabled={isLoadingFeed}
                        className="px-6 py-2 bg-[#1C4633] text-white rounded-lg hover:bg-[#1C4633]/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {isLoadingFeed ? 'Loading...' : 'Load More'}
                      </button>
                    </div>
                  )}
                </>
              )}
              </div>
            )}
            
            {!isAuthenticated && (
              <div className="bg-white rounded-xl shadow-lg border border-[#1C4633]/20 p-6">
                <div className="text-center py-8">
                  <svg
                    className="w-16 h-16 text-gray-300 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <p className="text-gray-600 text-lg font-medium mb-2">Login to see activity feed</p>
                  <p className="text-sm text-gray-500 mb-6">
                    Sign in to see routes and activities from users you follow
                  </p>
                  <Link
                    href="/login"
                    className="inline-block px-6 py-2 bg-[#1C4633] text-white rounded-lg hover:bg-[#1C4633]/90 transition-colors"
                  >
                    Login
                  </Link>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
