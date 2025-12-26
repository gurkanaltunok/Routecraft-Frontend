import { apiClient } from './client';

export interface TravelPlanCommentDto {
  commentID: number;
  text: string;
  timestamp: string;
  status: number; // 0: Pending, 1: Approved, 2: Rejected
  toxicityScore: number | null;
  authorID: string;
  authorName: string | null;
  authorEmail: string | null;
  authorImageUrl?: string | null;
  travelPlanID: number;
}

export interface CreateTravelPlanCommentDto {
  text: string;
  travelPlanID: number;
}

export const commentsApi = {
  // Get all approved comments for a travel plan
  getTravelPlanComments: async (travelPlanId: number): Promise<TravelPlanCommentDto[]> => {
    return apiClient.get<TravelPlanCommentDto[]>(`/api/comments/travel-plan/${travelPlanId}`);
  },

  // Create a new comment
  createComment: async (dto: CreateTravelPlanCommentDto): Promise<TravelPlanCommentDto> => {
    return apiClient.post<TravelPlanCommentDto>('/api/comments/travel-plan', dto);
  },
};

