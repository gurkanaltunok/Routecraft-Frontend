import { apiClient } from './client';

export interface ChatMessageDto {
  chatMessageID: number;
  content: string;
  senderId: string;
  senderName: string;
  senderImageUrl?: string;
  groupChatId?: number;
  privateChatId?: number;
  sentAt: string;
  isRead: boolean;
}

export interface CreateChatMessageDto {
  content: string;
  groupChatId?: number;
  privateChatId?: number;
}

export interface GroupChatDto {
  groupChatID: number;
  groupID: number;
  groupName: string;
  name: string;
  description?: string;
  chatType: 'Discussion' | 'Announcement'; // Chat türü
  isAdminOnly: boolean; // Sadece admin mesaj atabilir mi?
  isUserAdmin: boolean; // Kullanıcı bu grubun admini mi?
  createdAt: string;
  participantCount: number;
  unreadCount: number;
  lastMessage?: ChatMessageDto;
}

export interface PrivateChatDto {
  privateChatID: number;
  user1Id: string;
  user1Name: string;
  user1ImageUrl?: string;
  user2Id: string;
  user2Name: string;
  user2ImageUrl?: string;
  createdAt: string;
  unreadCount: number;
  lastMessage?: ChatMessageDto;
  otherUser?: {
    userId: string;
    userName: string;
    imageUrl?: string;
  };
}

export const chatApi = {
  // Send a message
  sendMessage: async (dto: CreateChatMessageDto): Promise<ChatMessageDto> => {
    return apiClient.post<ChatMessageDto>('/api/chat/messages', dto);
  },

  // Get group chat messages
  getGroupChatMessages: async (
    groupChatId: number,
    skip?: number,
    take?: number
  ): Promise<ChatMessageDto[]> => {
    const params = new URLSearchParams();
    if (skip !== undefined) params.append('skip', skip.toString());
    if (take !== undefined) params.append('take', take.toString());
    
    const query = params.toString();
    return apiClient.get<ChatMessageDto[]>(
      `/api/chat/group/${groupChatId}/messages${query ? `?${query}` : ''}`
    );
  },

  // Get private chat messages
  getPrivateChatMessages: async (
    privateChatId: number,
    skip?: number,
    take?: number
  ): Promise<ChatMessageDto[]> => {
    const params = new URLSearchParams();
    if (skip !== undefined) params.append('skip', skip.toString());
    if (take !== undefined) params.append('take', take.toString());
    
    const query = params.toString();
    return apiClient.get<ChatMessageDto[]>(
      `/api/chat/private/${privateChatId}/messages${query ? `?${query}` : ''}`
    );
  },

  // Get or create private chat
  getOrCreatePrivateChat: async (userId: string): Promise<PrivateChatDto> => {
    return apiClient.post<PrivateChatDto>(`/api/chat/private/with/${userId}`);
  },

  // Get all private chats for current user
  getUserPrivateChats: async (): Promise<PrivateChatDto[]> => {
    return apiClient.get<PrivateChatDto[]>('/api/chat/private');
  },

  // Get all group chats for current user
  getUserGroupChats: async (): Promise<GroupChatDto[]> => {
    return apiClient.get<GroupChatDto[]>('/api/chat/group');
  },

  // Get private chat ID from message ID
  getPrivateChatIdByMessageId: async (messageId: number): Promise<number | null> => {
    try {
      const response = await apiClient.get<{ privateChatId: number }>(`/api/chat/message/${messageId}/private-chat-id`);
      return response.privateChatId;
    } catch (error) {
      console.error('Error getting private chat ID from message ID:', error);
      return null;
    }
  },

  // Mark private chat messages as read
  markPrivateChatAsRead: async (privateChatId: number): Promise<{ markedAsRead: number }> => {
    return apiClient.post<{ markedAsRead: number }>(`/api/chat/private/${privateChatId}/read`);
  },

  // Mark group chat messages as read
  markGroupChatAsRead: async (groupChatId: number): Promise<{ markedAsRead: number }> => {
    return apiClient.post<{ markedAsRead: number }>(`/api/chat/group/${groupChatId}/read`);
  },
};

