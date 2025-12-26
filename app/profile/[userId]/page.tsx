'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { followApi, UserProfileSummaryDto, UserFollowDto } from '@/lib/api/follow';
import { chatApi } from '@/lib/api/chat';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { travelPlansApi, TravelPlanDto } from '@/lib/api/travelPlans';
import { formatMemberSince } from '@/lib/utils/dateUtils';
import Image from 'next/image';
import Header from '@/app/components/Header';
import Sidebar from '@/app/components/Sidebar';
import TravelPlanCard from '@/app/components/TravelPlanCard';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const userId = params.userId as string;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfileSummaryDto | null>(null);
  const [followers, setFollowers] = useState<UserFollowDto[]>([]);
  const [following, setFollowing] = useState<UserFollowDto[]>([]);
  const [travelPlans, setTravelPlans] = useState<TravelPlanDto[]>([]);
  const [activeTab, setActiveTab] = useState<'plans' | 'followers' | 'following'>('plans');
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  
  // Check token on mount and when dependencies change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = !!localStorage.getItem('auth_token');
      setHasToken(token);
    }
  }, [userId, isAuthenticated]); // Re-check when userId or auth state changes

  useEffect(() => {
    if (userId && !authLoading) {
      loadProfile();
      // Load travel plans only if authenticated (has token)
      if (hasToken) {
        loadTravelPlans();
      }
    }
  }, [userId, authLoading, hasToken]);

  useEffect(() => {
    if (profile) {
      setIsFollowing(profile.isFollowing);
      // Only load followers/following if authenticated
      if (hasToken) {
        if (activeTab === 'followers') {
          loadFollowers();
        } else if (activeTab === 'following') {
          loadFollowing();
        }
      }
    }
  }, [profile, activeTab, hasToken]);

  const loadProfile = async () => {
    try {
      const data = await followApi.getUserProfile(userId);
      setProfile(data);
      setIsFollowing(data.isFollowing);
    } catch (error: any) {
      console.error('Error loading profile:', error);
      showToast(error?.message || 'Failed to load profile', 'error');
      setProfile(null); // Ensure profile is set to null on error
    } finally {
      setIsLoading(false);
    }
  };

  const loadTravelPlans = async () => {
    // Only load travel plans if user is authenticated
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) {
      return; // Don't try to load if not authenticated
    }
    
    try {
      const plans = await travelPlansApi.getAll();
      const userPlans = plans.filter(p => p.creatorId === userId);
      setTravelPlans(userPlans);
    } catch (error: any) {
      console.error('Error loading travel plans:', error);
      // Don't show error toast if it's 401 - user might not be authenticated
      // This is expected for anonymous users viewing profiles
      if (error?.status !== 401) {
        console.error('Error loading travel plans (non-401):', error);
      }
    }
  };

  const loadFollowers = async () => {
    // Only load if authenticated
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) {
      setIsLoadingFollowers(false);
      return;
    }
    
    setIsLoadingFollowers(true);
    try {
      const data = await followApi.getFollowers(userId);
      setFollowers(data);
    } catch (error: any) {
      console.error('Error loading followers:', error);
      // Don't show error for 401 - expected for anonymous users
      if (error?.status !== 401) {
        showToast('Failed to load followers', 'error');
      }
    } finally {
      setIsLoadingFollowers(false);
    }
  };

  const loadFollowing = async () => {
    // Only load if authenticated
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) {
      setIsLoadingFollowing(false);
      return;
    }
    
    setIsLoadingFollowing(true);
    try {
      const data = await followApi.getFollowing(userId);
      setFollowing(data);
    } catch (error: any) {
      console.error('Error loading following:', error);
      // Don't show error for 401 - expected for anonymous users
      if (error?.status !== 401) {
        showToast('Failed to load following', 'error');
      }
    } finally {
      setIsLoadingFollowing(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!profile || isTogglingFollow) {
      return;
    }

    // Check if token exists - this is the real authentication check
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) {
      showToast('Please log in to follow users', 'error');
      return;
    }

    setIsTogglingFollow(true);
    try {
      if (isFollowing) {
        await followApi.unfollowUser(userId);
        setIsFollowing(false);
        setProfile((prev) => prev ? { ...prev, isFollowing: false, followerCount: prev.followerCount - 1 } : null);
        showToast('Unfollowed', 'info');
      } else {
        await followApi.followUser(userId);
        setIsFollowing(true);
        setProfile((prev) => prev ? { ...prev, isFollowing: true, followerCount: prev.followerCount + 1 } : null);
        showToast('Following', 'success');
      }
    } catch (error: any) {
      console.error('Error toggling follow:', error);
      const errorMessage = error?.message || 'An error occurred';
      showToast(errorMessage, 'error');
    } finally {
      setIsTogglingFollow(false);
    }
  };

  const handleStartChat = async () => {
    if (!hasToken || !currentUser) return;
    
    try {
      const chat = await chatApi.getOrCreatePrivateChat(userId);
      
      // Dispatch custom event to open chat in ChatWidget
      const event = new CustomEvent('openChat', {
        detail: { privateChatId: chat.privateChatID }
      });
      window.dispatchEvent(event);
      
      showToast('Chat opened!', 'success');
    } catch (error: any) {
      console.error('Error starting chat:', error);
      const errorMessage = error?.message || 'An error occurred while creating chat.';
      
      // Check if it's a follow-related error - show English message
      if (errorMessage.toLowerCase().includes('follow') || errorMessage.toLowerCase().includes('follow each other')) {
        showToast('You can only send messages to users you follow and who follow you back. Please follow each other first.', 'error');
      } else {
        showToast(errorMessage, 'error');
      }
    }
  };

  const handleSearch = (query: string) => {
    // Search functionality can be added later if needed
  };

  const formatDistance = (meters: number | null) => {
    if (!meters) return 'Unknown';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const getImageUrl = (imageUrl?: string | null) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${process.env.NEXT_PUBLIC_API_URL || 'https://routecraft.duckdns.org'}${imageUrl}`;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F4F2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1C4633] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#F4F4F2] flex flex-col">
        <Header onSearch={handleSearch} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="flex-1 lg:ml-64 transition-all duration-300 overflow-y-auto" style={{ minHeight: 'calc(100vh - 4rem)' }}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
              <p className="text-gray-600 text-lg mb-4">User not found</p>
              <button
                onClick={() => router.push('/discover')}
                className="px-6 py-2 bg-[#1C4633] text-white rounded-lg hover:bg-[#1C4633]/90 transition-colors"
              >
                Back to Discover
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.userId === userId;

  return (
    <div className="min-h-screen bg-[#F4F4F2] flex flex-col">
      <Header onSearch={handleSearch} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 lg:ml-64 transition-all duration-300 overflow-y-auto" style={{ minHeight: 'calc(100vh - 4rem)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Profile Header */}
            <div className="bg-white rounded-xl shadow-lg border border-[#1C4633]/20 p-8 mb-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                {/* Avatar */}
                <div className={`w-32 h-32 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ring-4 ring-[#1C4633]/20 ${
                  getImageUrl(profile.profileImageUrl) ? 'bg-white' : 'bg-gradient-to-br from-[#1C4633] to-[#DA922B]'
                }`}>
                  {getImageUrl(profile.profileImageUrl) ? (
                    <img
                      src={getImageUrl(profile.profileImageUrl)!}
                      alt={profile.userName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl text-white font-bold">
                      {profile.userName?.[0]?.toUpperCase() || 'U'}
                    </span>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h1 className="text-3xl font-bold text-[#1C4633] mb-2">{profile.userName || 'Unknown User'}</h1>
                      {profile.createdAt && (
                        <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Member since {formatMemberSince(profile.createdAt)}
                        </p>
                      )}
                      {profile.bio ? (
                        <p className="text-gray-700 text-base leading-relaxed mb-4 max-w-2xl">{profile.bio}</p>
                      ) : (
                        <p className="text-gray-400 italic text-sm mb-4">No bio available</p>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-8 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#1C4633]">{profile.travelPlanCount}</div>
                      <div className="text-sm text-gray-600 mt-1">Routes</div>
                    </div>
                    <button
                      onClick={() => setActiveTab('followers')}
                      className={`text-center transition-colors ${activeTab === 'followers' ? 'text-[#1C4633]' : 'text-gray-600 hover:text-[#1C4633]'}`}
                    >
                      <div className="text-2xl font-bold">{profile.followerCount}</div>
                      <div className="text-sm mt-1">Followers</div>
                    </button>
                    <button
                      onClick={() => setActiveTab('following')}
                      className={`text-center transition-colors ${activeTab === 'following' ? 'text-[#1C4633]' : 'text-gray-600 hover:text-[#1C4633]'}`}
                    >
                      <div className="text-2xl font-bold">{profile.followingCount}</div>
                      <div className="text-sm mt-1">Following</div>
                    </button>
                  </div>

                  {/* Actions */}
                  {!isOwnProfile && hasToken && (
                    <div className="flex gap-3">
                      <button
                        onClick={handleToggleFollow}
                        disabled={isTogglingFollow}
                        className={`px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          isFollowing
                            ? 'bg-gray-200 text-gray-900 hover:bg-gray-300 border border-gray-300'
                            : 'bg-[#1C4633] text-white hover:bg-[#1C4633]/90 shadow-md hover:shadow-lg'
                        }`}
                      >
                        {isTogglingFollow ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            Loading...
                          </span>
                        ) : isFollowing ? (
                          'Unfollow'
                        ) : (
                          'Follow'
                        )}
                      </button>
                      <button
                        onClick={handleStartChat}
                        className="px-6 py-2 rounded-lg font-medium bg-[#DA922B] text-white hover:bg-[#DA922B]/90 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Send Message
                      </button>
                    </div>
                  )}
                  {isOwnProfile && (
                    <Link
                      href="/profile"
                      className="inline-block px-6 py-2 rounded-lg font-medium bg-[#1C4633] text-white hover:bg-[#1C4633]/90 transition-all shadow-md hover:shadow-lg"
                    >
                      Edit Profile
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-lg border border-[#1C4633]/20 mb-6">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('plans')}
                  className={`flex-1 px-6 py-4 font-medium transition-all ${
                    activeTab === 'plans'
                      ? 'text-[#1C4633] border-b-2 border-[#1C4633] bg-[#1C4633]/5'
                      : 'text-gray-600 hover:text-[#1C4633] hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Routes ({travelPlans.length})
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('followers')}
                  className={`flex-1 px-6 py-4 font-medium transition-all ${
                    activeTab === 'followers'
                      ? 'text-[#1C4633] border-b-2 border-[#1C4633] bg-[#1C4633]/5'
                      : 'text-gray-600 hover:text-[#1C4633] hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Followers ({profile.followerCount})
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('following')}
                  className={`flex-1 px-6 py-4 font-medium transition-all ${
                    activeTab === 'following'
                      ? 'text-[#1C4633] border-b-2 border-[#1C4633] bg-[#1C4633]/5'
                      : 'text-gray-600 hover:text-[#1C4633] hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Following ({profile.followingCount})
                  </div>
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'plans' && (
                  <div>
                    {travelPlans.length === 0 ? (
                      <div className="text-center py-12">
                        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        <p className="text-gray-500 text-lg font-medium">No routes created yet</p>
                        <p className="text-gray-400 text-sm mt-2">This user hasn't created any routes</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {travelPlans.map((plan) => (
                          <TravelPlanCard key={plan.travelPlanID} travelPlan={plan} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'followers' && (
                  <div>
                    {isLoadingFollowers ? (
                      <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C4633]"></div>
                        <p className="mt-4 text-gray-600">Loading followers...</p>
                      </div>
                    ) : followers.length === 0 ? (
                      <div className="text-center py-12">
                        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-gray-500 text-lg font-medium">No followers yet</p>
                        <p className="text-gray-400 text-sm mt-2">This user doesn't have any followers</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {followers.map((follow) => (
                          <div
                            key={follow.userFollowID}
                            className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200"
                            onClick={() => router.push(`/profile/${follow.followerId}`)}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-14 h-14 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-[#1C4633]/20 ${
                                getImageUrl(follow.followerImageUrl) ? 'bg-white' : 'bg-gradient-to-br from-[#1C4633] to-[#DA922B]'
                              }`}>
                                {getImageUrl(follow.followerImageUrl) ? (
                                  <img
                                    src={getImageUrl(follow.followerImageUrl)!}
                                    alt={follow.followerName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-white font-bold text-lg">
                                    {follow.followerName?.[0]?.toUpperCase() || 'U'}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-[#1C4633] truncate">{follow.followerName}</p>
                                <p className="text-sm text-gray-500">Follower</p>
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

                {activeTab === 'following' && (
                  <div>
                    {isLoadingFollowing ? (
                      <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C4633]"></div>
                        <p className="mt-4 text-gray-600">Loading following...</p>
                      </div>
                    ) : following.length === 0 ? (
                      <div className="text-center py-12">
                        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <p className="text-gray-500 text-lg font-medium">Not following anyone yet</p>
                        <p className="text-gray-400 text-sm mt-2">This user isn't following anyone</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {following.map((follow) => (
                          <div
                            key={follow.userFollowID}
                            className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200"
                            onClick={() => router.push(`/profile/${follow.followingId}`)}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-14 h-14 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-[#1C4633]/20 ${
                                getImageUrl(follow.followingImageUrl) ? 'bg-white' : 'bg-gradient-to-br from-[#1C4633] to-[#DA922B]'
                              }`}>
                                {getImageUrl(follow.followingImageUrl) ? (
                                  <img
                                    src={getImageUrl(follow.followingImageUrl)!}
                                    alt={follow.followingName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-white font-bold text-lg">
                                    {follow.followingName?.[0]?.toUpperCase() || 'U'}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-[#1C4633] truncate">{follow.followingName}</p>
                                <p className="text-sm text-gray-500">Following</p>
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
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
