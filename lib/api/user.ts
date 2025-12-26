import { apiClient } from './client';

export interface UserProfile {
  id: string;
  userName: string;
  email: string;
  emailVerified: boolean;
  profileImageUrl?: string;
  bio?: string;
}

export interface UpdateUserProfileRequest {
  userName?: string;
  email?: string;
  bio?: string;
}

export const userApi = {
  getProfile: async (): Promise<UserProfile> => {
    return apiClient.get<UserProfile>('/api/user/profile');
  },

  updateProfile: async (request: UpdateUserProfileRequest): Promise<UserProfile> => {
    return apiClient.put<UserProfile>('/api/user/profile', request);
  },

  uploadProfileImage: async (file: File): Promise<{ imageUrl: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5007'}/api/user/profile/image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to upload image' }));
      throw new Error(errorData.message || 'Failed to upload image');
    }

    return response.json();
  },
};




