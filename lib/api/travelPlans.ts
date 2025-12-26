import { apiClient } from './client';

export interface CoordinateDto {
  longitude: number;
  latitude: number;
}

export interface StopDto {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category?: string | null;
  placeId?: string | null;
}

export interface TravelPlanDto {
  travelPlanID: number;
  title: string;
  description: string;
  type: number;
  difficulty: number;
  totalDistanceInMeters: number | null;
  totalElevationGainInMeters: number | null;
  averageRating: number;
  totalRatings: number;
  creatorId: string;
  creatorName: string;
  creatorImageUrl?: string | null;
  routePath: CoordinateDto[] | null;
  stops: StopDto[] | null;
  coverImageUrl?: string | null;
  createdAt: string;
}

export interface CreateTravelPlanRequest {
  title: string;
  description: string;
  type: number;
  difficulty: number;
  totalDistanceInMeters?: number | null;
  totalElevationGainInMeters?: number | null;
  routePath?: CoordinateDto[] | null;
  stops?: StopDto[] | null;
  coverImageUrl?: string | null;
}

// Activity Feed Types
export enum ActivityType {
  NewRoute = 1,
  Comment = 2,
  Rating = 3,
  Favorite = 4,
  Follow = 5
}

export interface ActivityFeedItemDto {
  activityId: number;
  type: ActivityType;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorImageUrl?: string | null;
  travelPlanId?: number | null;
  travelPlanTitle?: string | null;
  travelPlanCoverImageUrl?: string | null;
  travelPlanType?: number | null;
  commentText?: string | null;
  ratingStars?: number | null;
  targetUserId?: string | null;
  targetUserName?: string | null;
  targetUserImageUrl?: string | null;
}

export const travelPlansApi = {
  getAll: async (): Promise<TravelPlanDto[]> => {
    return apiClient.get<TravelPlanDto[]>('/api/travelplans');
  },

  getByType: async (routeType: number, searchQuery?: string): Promise<TravelPlanDto[]> => {
    const params = new URLSearchParams();
    params.append('type', routeType.toString());
    if (searchQuery) {
      params.append('search', searchQuery);
    }
    return apiClient.get<TravelPlanDto[]>(`/api/travelplans?${params.toString()}`);
  },

  getById: async (id: number): Promise<TravelPlanDto> => {
    return apiClient.get<TravelPlanDto>(`/api/travelplans/${id}`);
  },

  create: async (request: CreateTravelPlanRequest): Promise<TravelPlanDto> => {
    return apiClient.post<TravelPlanDto>('/api/travelplans', request);
  },

  update: async (id: number, request: CreateTravelPlanRequest): Promise<TravelPlanDto> => {
    return apiClient.put<TravelPlanDto>(`/api/travelplans/${id}`, request);
  },

  delete: async (id: number): Promise<void> => {
    return apiClient.delete<void>(`/api/travelplans/${id}`);
  },

  uploadCoverImage: async (id: number, file: File): Promise<{ imageUrl: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.postForm<{ imageUrl: string }>(`/api/travelplans/${id}/cover-image`, formData);
  },

  getFeed: async (skip = 0, take = 20): Promise<TravelPlanDto[]> => {
    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('take', take.toString());
    return apiClient.get<TravelPlanDto[]>(`/api/travelplans/feed?${params.toString()}`);
  },

  getActivityFeed: async (skip = 0, take = 20): Promise<ActivityFeedItemDto[]> => {
    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('take', take.toString());
    return apiClient.get<ActivityFeedItemDto[]>(`/api/travelplans/activity-feed?${params.toString()}`);
  },
};


