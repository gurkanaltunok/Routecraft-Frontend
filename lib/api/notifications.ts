import { apiClient } from './client';

export enum NotificationType {
  Follow = 1,
  Message = 2,
  Comment = 3,
  Rating = 4,
  Favorite = 5,
  GroupInvitation = 6,
}

export interface NotificationDto {
  notificationID: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityId?: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationsApi = {
  getNotifications: async (unreadOnly = false, skip = 0, take = 50): Promise<NotificationDto[]> => {
    const params = new URLSearchParams();
    params.append('unreadOnly', unreadOnly.toString());
    params.append('skip', skip.toString());
    params.append('take', take.toString());
    return apiClient.get<NotificationDto[]>(`/api/notifications?${params.toString()}`);
  },

  getUnreadCount: async (): Promise<number> => {
    return apiClient.get<number>('/api/notifications/unread/count');
  },

  markAsRead: async (notificationId: number): Promise<void> => {
    return apiClient.put<void>(`/api/notifications/${notificationId}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    return apiClient.put<void>('/api/notifications/read-all');
  },
};

