'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api/auth';
import { userApi, UserProfile } from '@/lib/api/user';
import { followApi, UserFollowDto } from '@/lib/api/follow';
import { travelPlansApi, TravelPlanDto } from '@/lib/api/travelPlans';
import Image from 'next/image';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import TravelPlanCard from '../components/TravelPlanCard';

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Follow stats
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followers, setFollowers] = useState<UserFollowDto[]>([]);
  const [following, setFollowing] = useState<UserFollowDto[]>([]);
  const [travelPlans, setTravelPlans] = useState<TravelPlanDto[]>([]);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'routes' | 'followers' | 'following'>('routes');
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(false);
  const [isLoadingTravelPlans, setIsLoadingTravelPlans] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Form state
  const [editData, setEditData] = useState({
    userName: '',
    email: '',
    bio: '',
  });

  // Email verification state
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const userProfile = await userApi.getProfile();
      setProfile(userProfile);
      setEditData({
        userName: userProfile.userName,
        email: userProfile.email,
        bio: userProfile.bio || '',
      });
      // Load follow stats after profile is loaded
      if (userProfile.id) {
        try {
          const followProfile = await followApi.getUserProfile(userProfile.id);
          setFollowerCount(followProfile.followerCount);
          setFollowingCount(followProfile.followingCount);
        } catch (error) {
          console.error('Error loading follow stats:', error);
        }
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      const errorMessage = error?.message || 'Failed to load profile.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };



  const loadFollowStats = async () => {
    try {
      if (profile?.id) {
        const userProfile = await followApi.getUserProfile(profile.id);
        setFollowerCount(userProfile.followerCount);
        setFollowingCount(userProfile.followingCount);
      }
    } catch (error) {
      console.error('Error loading follow stats:', error);
    }
  };

  const loadTravelPlans = async () => {
    if (!profile?.id) return;
    setIsLoadingTravelPlans(true);
    try {
      const plans = await travelPlansApi.getAll();
      const userPlans = plans.filter(p => p.creatorId === profile.id);
      setTravelPlans(userPlans);
    } catch (error) {
      console.error('Error loading travel plans:', error);
    } finally {
      setIsLoadingTravelPlans(false);
    }
  };

  const loadFollowers = async () => {
    if (!profile?.id) return;
    setIsLoadingFollowers(true);
    try {
      const data = await followApi.getFollowers(profile.id);
      setFollowers(data);
    } catch (error) {
      console.error('Error loading followers:', error);
    } finally {
      setIsLoadingFollowers(false);
    }
  };

  const loadFollowing = async () => {
    if (!profile?.id) return;
    setIsLoadingFollowing(true);
    try {
      const data = await followApi.getFollowing(profile.id);
      setFollowing(data);
    } catch (error) {
      console.error('Error loading following:', error);
    } finally {
      setIsLoadingFollowing(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (profile) {
      setEditData({
        userName: profile.userName,
        email: profile.email,
        bio: profile.bio || '',
      });
    }
    setIsEditing(false);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!profile) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const updated = await userApi.updateProfile({
        userName: editData.userName.trim(),
        email: editData.email.trim() !== profile.email ? editData.email.trim() : undefined,
        bio: editData.bio.trim() || undefined,
      });
      setProfile(updated);
      setIsEditing(false);
      // Email değiştiyse doğrulama mesajı göster
      if (editData.email.trim() !== profile.email) {
        setMessage({ type: 'success', text: 'Profile updated! Please verify your new email address.' });
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Invalid file type. Please select a JPG, PNG, GIF, or WEBP image.' });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File size exceeds 5MB limit.' });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const result = await userApi.uploadProfileImage(file);
      if (profile) {
        setProfile({ ...profile, profileImageUrl: result.imageUrl });
      }
      setMessage({ type: 'success', text: 'Profile image updated successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to upload image.' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSendVerificationCode = async () => {
    if (!profile?.email) return;

    setIsSendingCode(true);
    setMessage(null);

    try {
      const response = await authApi.resendVerificationCode({ email: profile.email });
      if (response.success) {
        setMessage({ type: 'success', text: 'Verification code sent to your email!' });
        setShowVerificationInput(true);
      } else {
        setMessage({ type: 'error', text: response.errors.join(', ') || 'Failed to send verification code.' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send verification code.' });
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!profile?.email || !verificationCode) return;

    setIsVerifying(true);
    setMessage(null);

    try {
      const response = await authApi.verifyEmail({
        email: profile.email,
        verificationCode: verificationCode,
      });
      if (response.success) {
        setMessage({ type: 'success', text: 'Email verified successfully!' });
        setShowVerificationInput(false);
        setVerificationCode('');
        // Reload profile to get updated emailVerified status
        await loadProfile();
      } else {
        setMessage({ type: 'error', text: response.errors.join(', ') || 'Verification failed.' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Verification failed.' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(value);
  };

  const getImageUrl = (imageUrl?: string) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://13.53.168.27:5000'}${imageUrl}`;
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
      loadFollowStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (profile?.id) {
      if (activeTab === 'routes') {
        loadTravelPlans();
      } else if (activeTab === 'followers') {
        loadFollowers();
      } else if (activeTab === 'following') {
        loadFollowing();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, activeTab]);

  if (authLoading || isLoading || !isAuthenticated) {
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
      <div className="min-h-screen bg-[#F4F4F2] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Failed to load profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F2] flex flex-col">
      <Header onSearch={() => {}} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className="flex-1 lg:ml-64 transition-all duration-300 overflow-y-auto" style={{ minHeight: 'calc(100vh - 4rem)' }}>
          <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-3xl w-full">
          <div className="bg-white rounded-xl shadow-lg border border-[#1C4633]/20 p-8">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-[#1C4633]">Profile</h1>
              {!isEditing && (
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-[#1C4633] text-white rounded-lg hover:bg-[#1C4633]/90 transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {/* Profile Image */}
            <div className="flex flex-col items-center mb-8">
              <div 
                className="relative group cursor-pointer"
                onClick={!isUploading ? handleImageClick : undefined}
              >
                <div
                  className={`w-32 h-32 rounded-full overflow-hidden border-4 border-[#1C4633]/20 ${
                    !isUploading ? 'hover:border-[#1C4633]/40 transition-all' : ''
                  }`}
                >
                  {getImageUrl(profile.profileImageUrl) ? (
                    <img
                      src={getImageUrl(profile.profileImageUrl) || ''}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#1C4633] to-[#DA922B] flex items-center justify-center text-white text-4xl font-bold">
                      {profile.userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {!isUploading && (
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center pointer-events-none">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />
              {!isEditing && (
                <p className="mt-2 text-sm text-gray-500">Click to change profile picture</p>
              )}
            </div>

            {/* Messages */}
            {message && (
              <div
                className={`mb-6 p-4 rounded-lg ${
                  message.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                {message.text}
              </div>
            )}

            {/* User Info */}
            <div className="space-y-6">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.userName}
                    onChange={(e) => setEditData({ ...editData, userName: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-[#1C4633]/30 rounded-lg focus:ring-2 focus:ring-[#1C4633]/20 focus:border-[#1C4633] outline-none transition-all text-gray-900"
                    placeholder="Username"
                  />
                ) : (
                  <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                    {profile.userName}
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-[#1C4633]/30 rounded-lg focus:ring-2 focus:ring-[#1C4633]/20 focus:border-[#1C4633] outline-none transition-all text-gray-900"
                      placeholder="Email address"
                    />
                    {editData.email !== profile.email && (
                      <p className="text-sm text-amber-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Email değişikliği sonrası yeniden doğrulama gerekecektir
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 flex items-center justify-between">
                      <span>{profile.email}</span>
                      {profile.emailVerified && (
                        <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Verified
                        </span>
                      )}
                    </div>
                    {!profile.emailVerified && (
                      <button
                        onClick={handleSendVerificationCode}
                        disabled={isSendingCode}
                        className="px-4 py-3 bg-[#DA922B] text-white rounded-lg hover:bg-[#DA922B]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                      >
                        {isSendingCode ? 'Sending...' : 'Verify Email'}
                      </button>
                    )}
                  </div>
                )}
                {!isEditing && !profile.emailVerified && (
                  <p className="mt-2 text-sm text-gray-500">
                    Please verify your email to enable commenting on routes.
                  </p>
                )}
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                {isEditing ? (
                  <textarea
                    value={editData.bio}
                    onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 bg-white border border-[#1C4633]/30 rounded-lg focus:ring-2 focus:ring-[#1C4633]/20 focus:border-[#1C4633] outline-none transition-all text-gray-900 resize-none"
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 min-h-[100px]">
                    {profile.bio || <span className="text-gray-400 italic">No bio yet...</span>}
                  </div>
                )}
              </div>

              {/* Follow Stats */}
              <div className="flex justify-center gap-12 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#1C4633]">{profile?.id ? travelPlans.length : 0}</div>
                  <div className="text-sm text-gray-600 mt-1">Routes</div>
                </div>
                <button
                  onClick={() => setActiveTab('followers')}
                  className={`text-center transition-colors ${activeTab === 'followers' ? 'text-[#1C4633]' : 'text-gray-600 hover:text-[#1C4633]'}`}
                >
                  <div className="text-2xl font-bold">{followerCount}</div>
                  <div className="text-sm mt-1">Followers</div>
                </button>
                <button
                  onClick={() => setActiveTab('following')}
                  className={`text-center transition-colors ${activeTab === 'following' ? 'text-[#1C4633]' : 'text-gray-600 hover:text-[#1C4633]'}`}
                >
                  <div className="text-2xl font-bold">{followingCount}</div>
                  <div className="text-sm mt-1">Following</div>
                </button>
              </div>

              {/* Verification Code Input */}
              {showVerificationInput && (
                <div>
                  <label className="block text-sm font-medium text-[#1C4633] mb-2">
                    Verification Code
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={handleCodeChange}
                      placeholder="000000"
                      maxLength={6}
                      className="flex-1 px-4 py-3 bg-white border border-[#1C4633]/30 rounded-lg focus:ring-2 focus:ring-[#1C4633]/20 focus:border-[#1C4633] outline-none transition-all text-gray-900 placeholder-gray-400 text-center text-2xl tracking-widest font-mono"
                      disabled={isVerifying}
                    />
                    <button
                      onClick={handleVerifyEmail}
                      disabled={isVerifying || verificationCode.length !== 6}
                      className="px-6 py-3 bg-[#1C4633] text-white rounded-lg hover:bg-[#1C4633]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    >
                      {isVerifying ? 'Verifying...' : 'Verify'}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Enter the 6-digit code sent to your email
                  </p>
                </div>
              )}

              {/* Edit Actions */}
              {isEditing && (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 px-6 py-3 bg-[#1C4633] text-white rounded-lg hover:bg-[#1C4633]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-lg border border-[#1C4633]/20 mt-6">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('routes')}
                className={`flex-1 px-6 py-4 font-medium transition-all ${
                  activeTab === 'routes'
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
                  Followers ({followerCount})
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
                  Following ({followingCount})
                </div>
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'routes' && (
                <div>
                  {isLoadingTravelPlans ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C4633]"></div>
                      <p className="mt-4 text-gray-600">Loading routes...</p>
                    </div>
                  ) : travelPlans.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      <p className="text-gray-500 text-lg font-medium">No routes created yet</p>
                      <p className="text-gray-400 text-sm mt-2">You haven't created any routes</p>
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
                      <p className="text-gray-400 text-sm mt-2">You don't have any followers</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
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
                      <p className="text-gray-400 text-sm mt-2">You aren't following anyone</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
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
          </div>
        </main>
      </div>
    </div>
  );
}
