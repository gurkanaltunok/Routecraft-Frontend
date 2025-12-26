'use client';

import React, { useState, useEffect, useRef } from 'react';
import { chatApi, ChatMessageDto, PrivateChatDto, GroupChatDto } from '@/lib/api/chat';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

type ChatTab = 'private' | 'group';
type SelectedChat = PrivateChatDto | GroupChatDto | null;

export default function ChatWidget() {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ChatTab>('private');
  const [privateChats, setPrivateChats] = useState<PrivateChatDto[]>([]);
  const [groupChats, setGroupChats] = useState<GroupChatDto[]>([]);
  const [selectedChat, setSelectedChat] = useState<SelectedChat>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && selectedChat) {
      inputRef.current?.focus();
    }
  }, [isOpen, selectedChat]);

  // Load unread count on mount and periodically
  useEffect(() => {
    if (isAuthenticated) {
      loadTotalUnreadCount();
      const interval = setInterval(loadTotalUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Load chats when widget opens
  useEffect(() => {
    if (isOpen && isAuthenticated && !selectedChat) {
      if (activeTab === 'private') {
        loadPrivateChats();
      } else if (activeTab === 'group') {
        loadGroupChats();
      }
    }
  }, [isOpen, activeTab, isAuthenticated]);

  // Listen for custom event to open a specific chat
  useEffect(() => {
    const handleOpenChat = async (event: Event) => {
      const customEvent = event as CustomEvent<{ privateChatId: number }>;
      const { privateChatId } = customEvent.detail;
      
      // Open widget if not open
      setIsOpen(true);
      
      // Set active tab to private
      setActiveTab('private');
      
      // Load private chats and find the chat
      try {
        const chats = await loadPrivateChats();
        const foundChat = chats.find(c => c.privateChatID === privateChatId);
        if (foundChat) {
          setSelectedChat(foundChat);
        }
      } catch (error) {
        console.error('Error opening chat:', error);
      }
    };

    window.addEventListener('openChat', handleOpenChat);
    return () => {
      window.removeEventListener('openChat', handleOpenChat);
    };
  }, [isAuthenticated]);

  const loadTotalUnreadCount = async () => {
    try {
      const [privateChatsData, groupChatsData] = await Promise.all([
        chatApi.getUserPrivateChats(),
        chatApi.getUserGroupChats()
      ]);
      const privateUnread = privateChatsData.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
      const groupUnread = groupChatsData.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
      setTotalUnreadCount(privateUnread + groupUnread);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const loadPrivateChats = async (): Promise<PrivateChatDto[]> => {
    setIsLoading(true);
    try {
      const chats = await chatApi.getUserPrivateChats();
      setPrivateChats(chats);
      // Update total unread count
      const privateUnread = chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
      const groupUnread = groupChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
      setTotalUnreadCount(privateUnread + groupUnread);
      return chats;
    } catch (error) {
      console.error('Error loading private chats:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const loadGroupChats = async () => {
    setIsLoading(true);
    try {
      const chats = await chatApi.getUserGroupChats();
      setGroupChats(chats);
      // Update total unread count
      const privateUnread = privateChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
      const groupUnread = chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
      setTotalUnreadCount(privateUnread + groupUnread);
    } catch (error) {
      console.error('Error loading group chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load messages when chat is selected
  useEffect(() => {
    if (selectedChat && isAuthenticated) {
      loadMessages();
    }
  }, [selectedChat]);

  const loadMessages = async () => {
    if (!selectedChat) return;

    setIsLoading(true);
    try {
      let msgs: ChatMessageDto[] = [];
      if ('privateChatID' in selectedChat) {
        msgs = await chatApi.getPrivateChatMessages(selectedChat.privateChatID);
      } else if ('groupChatID' in selectedChat) {
        msgs = await chatApi.getGroupChatMessages(selectedChat.groupChatID);
      }
      setMessages(msgs);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || isSending) return;

    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX
    setIsSending(true);
    
    try {
      let message: ChatMessageDto;
      if ('privateChatID' in selectedChat) {
        message = await chatApi.sendMessage({
          content: messageContent,
          privateChatId: selectedChat.privateChatID,
        });
      } else if ('groupChatID' in selectedChat) {
        message = await chatApi.sendMessage({
          content: messageContent,
          groupChatId: selectedChat.groupChatID,
        });
      } else {
        return;
      }

      setMessages((prev) => [...prev, message]);
      
      // Update chat's last message
      setSelectedChat((prev) => 
        prev ? { ...prev, lastMessage: message, unreadCount: 0 } : null
      );
      showToast('Message sent', 'success');
    } catch (error: any) {
      console.error('Error sending message:', error);
      // Restore message if sending failed
      setNewMessage(messageContent);
      const errorMessage = error?.message || 'Error sending message';
      showToast(errorMessage, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    
    return date.toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'short',
      timeZone: 'Europe/Istanbul' // GMT+2
    });
  };

  const getImageUrl = (imageUrl?: string) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${process.env.NEXT_PUBLIC_API_URL || 'https://routecraft.duckdns.org'}${imageUrl}`;
  };

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Chat Button - Fixed bottom right */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-[#1C4633] hover:bg-[#1C4633]/90 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-110"
          aria-label="Open chat"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          {totalUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
              {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col border border-gray-200">
          {/* Header */}
          <div className="bg-[#1C4633] text-white p-4 rounded-t-lg flex items-center justify-between">
            <h3 className="font-semibold text-lg">Messages</h3>
            <button
              onClick={() => {
                setIsOpen(false);
                setSelectedChat(null);
                setMessages([]);
              }}
              className="hover:bg-[#1C4633]/80 rounded-full p-1 transition-colors"
              aria-label="Close chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => {
                setActiveTab('private');
                setSelectedChat(null);
                setMessages([]);
              }}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'private'
                  ? 'text-[#1C4633] border-b-2 border-[#1C4633]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Private Messages
            </button>
            <button
              onClick={() => {
                setActiveTab('group');
                setSelectedChat(null);
                setMessages([]);
              }}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'group'
                  ? 'text-[#1C4633] border-b-2 border-[#1C4633]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Group Chats
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {!selectedChat ? (
              // Chat List
              <div className="flex-1 overflow-y-auto">
                {activeTab === 'private' ? (
                  isLoading ? (
                    <div className="text-center text-gray-500 py-8">
                      <p className="text-sm">Loading...</p>
                    </div>
                  ) : privateChats.length === 0 ? (
                    <div className="text-center text-gray-500 py-8 px-4">
                      <p className="text-sm">No private messages yet</p>
                      <p className="text-xs mt-2">Visit a user's profile to send a message</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {privateChats.map((chat) => (
                        <button
                          key={chat.privateChatID}
                          onClick={() => setSelectedChat(chat)}
                          className="w-full p-3 hover:bg-gray-50 transition-colors text-left flex items-center gap-3"
                        >
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-[#1C4633]/20 ${
                            getImageUrl(chat.otherUser?.imageUrl) ? 'bg-white' : 'bg-gradient-to-br from-[#1C4633] to-[#DA922B]'
                          }`}>
                            {getImageUrl(chat.otherUser?.imageUrl) ? (
                              <img src={getImageUrl(chat.otherUser?.imageUrl)!} alt={chat.otherUser?.userName || 'User'} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white text-sm font-bold">
                                {chat.otherUser?.userName?.[0]?.toUpperCase() || 'U'}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-sm text-gray-900 truncate">
                                {chat.otherUser?.userName || 'User'}
                              </p>
                              {chat.unreadCount > 0 && (
                                <span className="bg-[#1C4633] text-white text-xs font-semibold rounded-full px-2 py-0.5 flex-shrink-0">
                                  {chat.unreadCount}
                                </span>
                              )}
                            </div>
                            {chat.lastMessage && (
                              <p className="text-xs text-gray-500 truncate">
                                {chat.lastMessage.content}
                              </p>
                            )}
                            {chat.lastMessage && (
                              <p className="text-xs text-gray-400 mt-1">
                                {formatTime(chat.lastMessage.sentAt)}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                ) : (
                  isLoading ? (
                    <div className="text-center text-gray-500 py-8">
                      <p className="text-sm">Loading...</p>
                    </div>
                  ) : groupChats.length === 0 ? (
                    <div className="text-center text-gray-500 py-8 px-4">
                      <p className="text-sm">No group chats yet</p>
                      <p className="text-xs mt-2">Join a group to start chatting</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {groupChats.map((chat) => (
                        <button
                          key={chat.groupChatID}
                          onClick={() => setSelectedChat(chat)}
                          className="w-full p-3 hover:bg-gray-50 transition-colors text-left flex items-center gap-3"
                        >
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${
                            chat.chatType === 'Announcement' 
                              ? 'bg-[#DA922B]/20' 
                              : 'bg-[#1C4633]/20'
                          }`}>
                            <span className={`text-sm font-medium ${
                              chat.chatType === 'Announcement' 
                                ? 'text-[#DA922B]' 
                                : 'text-[#1C4633]'
                            }`}>
                              {chat.chatType === 'Announcement' ? '📢' : '💬'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <p className="font-medium text-sm text-gray-900 truncate">
                                  {chat.groupName}
                                </p>
                                {chat.chatType === 'Announcement' && (
                                  <span className="text-xs bg-[#DA922B]/20 text-[#DA922B] px-1.5 py-0.5 rounded flex-shrink-0">
                                    Announcements
                                  </span>
                                )}
                              </div>
                              {chat.unreadCount > 0 && (
                                <span className="bg-[#1C4633] text-white text-xs font-semibold rounded-full px-2 py-0.5 flex-shrink-0">
                                  {chat.unreadCount}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">{chat.name}</p>
                            {chat.lastMessage && (
                              <p className="text-xs text-gray-500 truncate mt-1">
                                {chat.lastMessage.content}
                              </p>
                            )}
                            {chat.lastMessage && (
                              <p className="text-xs text-gray-400 mt-1">
                                {formatTime(chat.lastMessage.sentAt)}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                )}
              </div>
            ) : (
              // Messages
              <>
                {/* Chat Header */}
                <div className="border-b border-gray-200 p-3 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-white shadow-sm ${
                    'groupChatID' in selectedChat 
                      ? (selectedChat.chatType === 'Announcement' ? 'bg-[#DA922B]/20' : 'bg-[#1C4633]/20')
                      : ('otherUser' in selectedChat && getImageUrl(selectedChat.otherUser?.imageUrl) ? 'bg-white' : 'bg-gradient-to-br from-[#1C4633] to-[#DA922B]')
                  }`}>
                    {'otherUser' in selectedChat && getImageUrl(selectedChat.otherUser?.imageUrl) ? (
                      <img src={getImageUrl(selectedChat.otherUser?.imageUrl)!} alt={selectedChat.otherUser?.userName || 'User'} className="w-full h-full object-cover" />
                    ) : 'groupChatID' in selectedChat ? (
                      <span className={`text-sm font-medium ${
                        selectedChat.chatType === 'Announcement' ? 'text-[#DA922B]' : 'text-[#1C4633]'
                      }`}>
                        {selectedChat.chatType === 'Announcement' ? '📢' : '💬'}
                      </span>
                    ) : (
                      <span className="text-white text-sm font-bold">
                        {('otherUser' in selectedChat && selectedChat.otherUser?.userName?.[0]?.toUpperCase()) || 'U'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {('otherUser' in selectedChat && selectedChat.otherUser?.userName) || 
                       ('groupName' in selectedChat && selectedChat.groupName) || 
                       'User'}
                    </p>
                    {'groupChatID' in selectedChat && (
                      <p className="text-xs text-gray-500">
                        {selectedChat.chatType === 'Announcement' 
                          ? '📢 Announcements - Admin only' 
                          : '💬 Discussion'}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedChat(null);
                      setMessages([]);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {isLoading ? (
                    <div className="text-center text-gray-500 py-8">
                      <p className="text-sm">Loading messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <p className="text-sm">No messages yet</p>
                      <p className="text-xs mt-2">Send your first message!</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isOwn = message.senderId === user?.userId;
                      const isGroupChat = 'groupChatID' in (selectedChat || {});
                      return (
                        <div
                          key={message.chatMessageID}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'} gap-2`}
                        >
                          {/* Profile image for other users */}
                          {!isOwn && (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-white shadow-sm ${
                              getImageUrl(message.senderImageUrl) ? 'bg-white' : 'bg-gradient-to-br from-[#1C4633] to-[#DA922B]'
                            }`}>
                              {getImageUrl(message.senderImageUrl) ? (
                                <img 
                                  src={getImageUrl(message.senderImageUrl)!} 
                                  alt={message.senderName} 
                                  className="w-full h-full object-cover" 
                                />
                              ) : (
                                <span className="text-white text-xs font-bold">
                                  {message.senderName?.[0]?.toUpperCase() || 'U'}
                                </span>
                              )}
                            </div>
                          )}
                          <div
                            className={`max-w-[70%] rounded-lg px-3 py-2 ${
                              isOwn
                                ? 'bg-[#1C4633] text-white'
                                : 'bg-gray-100 text-[#1C4633]'
                            }`}
                          >
                            {!isOwn && isGroupChat && (
                              <p className="text-xs font-medium mb-1 opacity-75 text-[#1C4633]">
                                {message.senderName}
                              </p>
                            )}
                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                            <div className="flex items-center justify-end gap-1.5 mt-1">
                              <p className={`text-xs ${isOwn ? 'text-white/70' : 'text-[#1C4633]/70'}`}>
                                {formatTime(message.sentAt)}
                              </p>
                              {isOwn && (
                                <div className="flex items-center">
                                  {message.isRead ? (
                                    // Double checkmark (read) - two checkmarks side by side
                                    <div className="flex items-center -ml-1">
                                      <svg
                                        className={`w-3.5 h-3.5 ${isOwn ? 'text-white/90' : 'text-[#1C4633]/90'}`}
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <svg
                                        className={`w-3.5 h-3.5 -ml-2.5 ${isOwn ? 'text-white/90' : 'text-[#1C4633]/90'}`}
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </div>
                                  ) : (
                                    // Single checkmark (sent, not read)
                                    <svg
                                      className={`w-3.5 h-3.5 ${isOwn ? 'text-white/70' : 'text-[#1C4633]/70'}`}
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-3">
                  {/* Check if this is an admin-only chat and user is not admin */}
                  {'groupChatID' in selectedChat && selectedChat.isAdminOnly && !selectedChat.isUserAdmin ? (
                    <div className="text-center text-gray-500 py-2 px-4 bg-gray-50 rounded-lg">
                      <p className="text-sm">📢 Only the group admin can post announcements</p>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C4633]"
                        disabled={isSending}
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim() || isSending}
                        className="bg-[#1C4633] text-white px-4 py-2 rounded-lg hover:bg-[#1C4633]/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSending ? (
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

