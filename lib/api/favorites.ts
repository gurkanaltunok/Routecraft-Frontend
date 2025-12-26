import { apiClient } from './client';

export interface UserFavoriteTripDto {
  userID: string;
  travelPlanID: number;
  favoritedAt: string;
  travelPlanTitle: string;
}

export interface CreateFavoriteDto {
  travelPlanID: number;
}

export interface IsFavoriteResponse {
  isFavorite: boolean;
}

export const favoritesApi = {
  // Get all favorites for the current user
  getUserFavorites: async (): Promise<UserFavoriteTripDto[]> => {
    return apiClient.get<UserFavoriteTripDto[]>('/api/favorites');
  },

  // Check if a travel plan is in user's favorites
  isFavorite: async (travelPlanId: number): Promise<boolean> => {
    try {
      const response = await apiClient.get<IsFavoriteResponse>(`/api/favorites/${travelPlanId}/check`);
      return response.isFavorite;
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        return false;
      }
      throw error;
    }
  },

  // Add a travel plan to favorites
  addFavorite: async (dto: CreateFavoriteDto): Promise<UserFavoriteTripDto> => {
    return apiClient.post<UserFavoriteTripDto>('/api/favorites', {
      travelPlanID: dto.travelPlanID
    });
  },

  // Remove a travel plan from favorites
  removeFavorite: async (travelPlanId: number): Promise<void> => {
    return apiClient.delete<void>(`/api/favorites/${travelPlanId}`);
  },
};

