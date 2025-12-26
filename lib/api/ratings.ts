import { apiClient } from './client';

export interface TravelPlanRatingDto {
  ratingID: number;
  stars: number;
  timestamp: string;
  userID: string;
  userName: string;
  travelPlanID: number;
}

export interface CreateTravelPlanRatingDto {
  travelPlanID: number;
  stars: number;
}

export interface UpdateTravelPlanRatingDto {
  stars: number;
}

export const ratingsApi = {
  // Get all ratings for a travel plan
  getTravelPlanRatings: async (travelPlanId: number): Promise<TravelPlanRatingDto[]> => {
    return apiClient.get<TravelPlanRatingDto[]>(`/api/ratings/travel-plan/${travelPlanId}`);
  },

  // Get current user's rating for a travel plan
  getUserRatingForTravelPlan: async (travelPlanId: number): Promise<TravelPlanRatingDto | null> => {
    try {
      return await apiClient.get<TravelPlanRatingDto>(`/api/ratings/travel-plan/${travelPlanId}/user`);
    } catch (error: any) {
      if (error.message?.includes('404') || error.message?.includes('Not Found')) {
        return null;
      }
      throw error;
    }
  },

  // Create a new rating
  createRating: async (dto: CreateTravelPlanRatingDto): Promise<TravelPlanRatingDto> => {
    return apiClient.post<TravelPlanRatingDto>('/api/ratings/travel-plan', dto);
  },

  // Update an existing rating
  updateRating: async (ratingId: number, dto: UpdateTravelPlanRatingDto): Promise<TravelPlanRatingDto> => {
    return apiClient.put<TravelPlanRatingDto>(`/api/ratings/${ratingId}`, dto);
  },

  // Delete a rating
  deleteRating: async (ratingId: number): Promise<void> => {
    return apiClient.delete<void>(`/api/ratings/${ratingId}`);
  },
};

