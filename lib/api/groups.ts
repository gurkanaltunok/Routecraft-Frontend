import { apiClient } from './client';

export interface GroupDto {
  groupID: number;
  name: string;
  description: string;
  isPublic: boolean;
  creatorId: string;
  creatorName?: string | null;
  memberCount: number;
}

export interface CreateGroupDto {
  name: string;
  description: string;
  isPublic: boolean;
}

export interface UserGroupDto {
  userID: string;
  userName?: string | null;
  userEmail?: string | null;
  profileImageUrl?: string | null;
  groupID: number;
  groupName?: string | null;
}

export const groupsApi = {
  getAll: async (): Promise<GroupDto[]> => {
    return apiClient.get<GroupDto[]>('/api/groups');
  },

  getById: async (id: number): Promise<GroupDto> => {
    return apiClient.get<GroupDto>(`/api/groups/${id}`);
  },

  create: async (group: CreateGroupDto): Promise<GroupDto> => {
    return apiClient.post<GroupDto>('/api/groups', group);
  },

  join: async (groupId: number): Promise<void> => {
    return apiClient.post<void>(`/api/groups/${groupId}/join`, {});
  },

  leave: async (groupId: number): Promise<void> => {
    return apiClient.post<void>(`/api/groups/${groupId}/leave`, {});
  },

  getMembers: async (groupId: number): Promise<UserGroupDto[]> => {
    return apiClient.get<UserGroupDto[]>(`/api/groups/${groupId}/members`);
  },

  invite: async (groupId: number, userId: string): Promise<void> => {
    return apiClient.post<void>(`/api/groups/${groupId}/invite`, { userId });
  },

  acceptInvitation: async (notificationId: number): Promise<void> => {
    return apiClient.post<void>('/api/groups/accept-invitation', { notificationId });
  },

  rejectInvitation: async (notificationId: number): Promise<void> => {
    return apiClient.post<void>('/api/groups/reject-invitation', { notificationId });
  },

  getMyGroups: async (): Promise<GroupDto[]> => {
    return apiClient.get<GroupDto[]>('/api/groups/my-groups');
  },

  delete: async (groupId: number): Promise<void> => {
    return apiClient.delete<void>(`/api/groups/${groupId}`);
  },

  removeMember: async (groupId: number, memberId: string): Promise<void> => {
    return apiClient.delete<void>(`/api/groups/${groupId}/members/${memberId}`);
  },
};

export interface ActivityTypeDto {
  activityTypeID: number;
  name: string;
  description?: string | null;
  iconUrl?: string | null;
}

export const activityTypesApi = {
  getAll: async (): Promise<ActivityTypeDto[]> => {
    return apiClient.get<ActivityTypeDto[]>('/api/ActivityTypes');
  },
};

