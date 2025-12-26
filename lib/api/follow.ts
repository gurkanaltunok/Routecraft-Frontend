import { apiClient } from './client';

export interface UserFollowDto {
  userFollowID: number;
  followerId: string;
  followerName: string;
  followerImageUrl?: string;
  followingId: string;
  followingName: string;
  followingImageUrl?: string;
  followedAt: string;
}

export interface FollowStatusDto {
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}

export interface UserProfileSummaryDto {
  userId: string;
  userName: string;
  email?: string; // Email sadece kendi profilinde görüntülenir
  profileImageUrl?: string;
  bio?: string;
  followerCount: number;
  followingCount: number;
  travelPlanCount: number;
  isFollowing: boolean;
  isFollowedBy: boolean;
  createdAt: string;
}

export const followApi = {
  // Follow a user
  followUser: async (userId: string): Promise<UserFollowDto> => {
    return apiClient.post<UserFollowDto>(`/api/follow/${userId}/follow`);
  },

  // Unfollow a user
  unfollowUser: async (userId: string): Promise<void> => {
    return apiClient.delete<void>(`/api/follow/${userId}/follow`);
  },

  // Get follow status
  getFollowStatus: async (userId: string): Promise<FollowStatusDto> => {
    return apiClient.get<FollowStatusDto>(`/api/follow/${userId}/status`);
  },

  // Get user profile
  getUserProfile: async (userId: string): Promise<UserProfileSummaryDto> => {
    return apiClient.get<UserProfileSummaryDto>(`/api/follow/${userId}/profile`);
  },

  // Get followers
  getFollowers: async (userId: string): Promise<UserFollowDto[]> => {
    return apiClient.get<UserFollowDto[]>(`/api/follow/${userId}/followers`);
  },

  // Get following
  getFollowing: async (userId: string): Promise<UserFollowDto[]> => {
    return apiClient.get<UserFollowDto[]>(`/api/follow/${userId}/following`);
  },

  // Search users
  searchUsers: async (searchTerm: string, skip = 0, take = 20): Promise<UserProfileSummaryDto[]> => {
    const params = new URLSearchParams();
    params.append('q', searchTerm);
    params.append('skip', skip.toString());
    params.append('take', take.toString());
    return apiClient.get<UserProfileSummaryDto[]>(`/api/follow/search?${params.toString()}`);
  },
};

