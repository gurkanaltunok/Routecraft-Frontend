import { apiClient } from './client';

export interface GroupEventDto {
  groupEventID: number;
  groupID: number;
  groupName: string;
  title: string;
  description: string;
  eventDate: string;
  endDate: string | null;
  travelPlanID: number;
  travelPlanTitle?: string | null;
  travelPlanDescription?: string | null;
  travelPlanCoverImageUrl?: string | null;
  currentParticipants: number;
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
  isUserParticipating: boolean;
}

export interface CreateGroupEventDto {
  groupID: number;
  title: string;
  description: string;
  eventDate: string;
  endDate?: string | null;
  travelPlanID: number;
}

export const groupEventsApi = {
  getGroupEvents: async (groupId: number): Promise<GroupEventDto[]> => {
    return apiClient.get<GroupEventDto[]>(`/api/groupevents/group/${groupId}`);
  },

  createEvent: async (event: CreateGroupEventDto): Promise<GroupEventDto> => {
    return apiClient.post<GroupEventDto>('/api/groupevents', event);
  },

  joinEvent: async (eventId: number): Promise<void> => {
    return apiClient.post<void>(`/api/groupevents/${eventId}/join`, {});
  },

  leaveEvent: async (eventId: number): Promise<void> => {
    return apiClient.post<void>(`/api/groupevents/${eventId}/leave`, {});
  },

  updateEvent: async (eventId: number, event: CreateGroupEventDto): Promise<GroupEventDto> => {
    return apiClient.put<GroupEventDto>(`/api/groupevents/${eventId}`, event);
  },

  deleteEvent: async (eventId: number): Promise<void> => {
    return apiClient.delete<void>(`/api/groupevents/${eventId}`);
  },
};

