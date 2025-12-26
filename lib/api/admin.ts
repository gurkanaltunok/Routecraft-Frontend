import { apiClient } from './client';

export interface PendingCommentDto {
  commentID: number;
  text: string;
  timestamp: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Deleted';
  toxicityScore: number | null;
  authorID: string;
  authorName: string | null;
  authorEmail: string | null;
  commentType: 'TravelPlan' | 'Group';
  relatedEntityID: number;
  relatedEntityTitle: string;
}

export interface AdminStatsDto {
  pendingComments: number;
  totalUsers: number;
  totalRoutes: number;
  totalGroups: number;
  activeUsers: number;
  totalComments: number;
  verifiedUsers: number;
  inactiveUsers: number;
  approvedComments: number;
  rejectedComments: number;
  tripRoutes: number;
  hikingRoutes: number;
  totalRatings: number;
  averageRating: number;
  totalGroupMembers: number;
}

export interface UserManagementDto {
  userId: string;
  userName: string;
  email: string;
  isActive: boolean;
  emailConfirmed: boolean;
  createdAt: string | null;
  travelPlanCount: number;
  commentCount: number;
}

export const adminApi = {
  // Get admin dashboard statistics
  getStats: async (): Promise<AdminStatsDto> => {
    return apiClient.get<AdminStatsDto>('/api/admin/stats');
  },

  // Get all pending comments
  getPendingComments: async (): Promise<PendingCommentDto[]> => {
    return apiClient.get<PendingCommentDto[]>('/api/admin/comments/pending');
  },

  // Get all comments with filters
  getAllComments: async (status?: string, commentType?: string): Promise<PendingCommentDto[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (commentType) params.append('commentType', commentType);
    const query = params.toString();
    return apiClient.get<PendingCommentDto[]>(`/api/admin/comments/all${query ? `?${query}` : ''}`);
  },

  // Approve a comment
  approveComment: async (commentId: number, commentType: string): Promise<PendingCommentDto> => {
    return apiClient.put<PendingCommentDto>(
      `/api/admin/comments/${commentId}/approve?commentType=${commentType}`
    );
  },

  // Reject a comment
  rejectComment: async (commentId: number, commentType: string): Promise<PendingCommentDto> => {
    return apiClient.put<PendingCommentDto>(
      `/api/admin/comments/${commentId}/reject?commentType=${commentType}`
    );
  },

  // Get all users
  getAllUsers: async (isActive?: boolean): Promise<UserManagementDto[]> => {
    const params = new URLSearchParams();
    if (isActive !== undefined) params.append('isActive', isActive.toString());
    const query = params.toString();
    return apiClient.get<UserManagementDto[]>(`/api/admin/users${query ? `?${query}` : ''}`);
  },

  // Update user status
  updateUserStatus: async (userId: string, isActive: boolean): Promise<void> => {
    return apiClient.put<void>(`/api/admin/users/${userId}/status`, { isActive });
  },
};

