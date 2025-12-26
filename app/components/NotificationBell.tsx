'use client';

import React, { useState, useEffect, useRef } from 'react';
import { notificationsApi, NotificationDto } from '@/lib/api/notifications';
import { groupsApi } from '@/lib/api/groups';
import { chatApi } from '@/lib/api/chat';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getRelativeTime, formatLocalDate } from '@/lib/utils/dateUtils';

export default function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    loadUnreadCount();
    loadNotifications();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadUnreadCount();
      if (isOpen) {
        loadNotifications();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadUnreadCount = async () => {
    if (!isAuthenticated) return;
    
    try {
      // Get all notifications and count non-message unread ones
      const data = await notificationsApi.getNotifications(false, 0, 100);
      // Filter out message notifications (type 2) - they are shown in ChatWidget
      const nonMessageUnread = data.filter((n: NotificationDto) => n.type !== 2 && !n.isRead);
      setUnreadCount(nonMessageUnread.length);
    } catch (error: any) {
      // Silently fail if unauthorized - user might not be logged in yet
      if (error?.status !== 401) {
        console.error('Error loading unread count:', error);
      }
    }
  };

  const loadNotifications = async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    try {
      const data = await notificationsApi.getNotifications(false, 0, 20);
      // Filter out message notifications (type 2) - they are shown in ChatWidget
      const filteredData = data.filter((n: NotificationDto) => n.type !== 2);
      setNotifications(filteredData);
    } catch (error: any) {
      // Only show error if it's not a 401 (unauthorized) - user might not be logged in yet
      if (error?.status !== 401) {
        console.error('Error loading notifications:', error);
        showToast('Error loading notifications', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.notificationID === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      showToast('All notifications marked as read', 'success');
    } catch (error) {
      console.error('Error marking all as read:', error);
      showToast('Error marking all as read', 'error');
    }
  };

  const handleAcceptGroupInvitation = async (notificationId: number, groupId: string) => {
    try {
      // Immediately remove notification from list to prevent double-clicking
      setNotifications((prev) => prev.filter((n) => n.notificationID !== notificationId));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      
      await groupsApi.acceptInvitation(notificationId);
      showToast('Successfully joined the group', 'success');
      router.push(`/groups/${groupId}`);
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error accepting group invitation:', error);
      showToast(error.message || 'Error accepting invitation', 'error');
      // Reload notifications to restore state on error
      loadNotifications();
    }
  };

  const handleRejectGroupInvitation = async (notificationId: number) => {
    try {
      // Immediately remove notification from list to prevent double-clicking
      setNotifications((prev) => prev.filter((n) => n.notificationID !== notificationId));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      
      await groupsApi.rejectInvitation(notificationId);
      showToast('Invitation rejected', 'info');
    } catch (error: any) {
      console.error('Error rejecting group invitation:', error);
      showToast(error.message || 'Error rejecting invitation', 'error');
      // Reload notifications to restore state on error
      loadNotifications();
    }
  };

  const handleMessageNotificationClick = async (notification: NotificationDto) => {
    if (!notification.relatedEntityId) return;
    
    try {
      const messageId = parseInt(notification.relatedEntityId, 10);
      if (isNaN(messageId)) return;

      const privateChatId = await chatApi.getPrivateChatIdByMessageId(messageId);
      if (privateChatId) {
        // Dispatch custom event to open chat
        window.dispatchEvent(new CustomEvent('openChat', { 
          detail: { privateChatId } 
        }));
        
        // Mark notification as read
        await handleMarkAsRead(notification.notificationID);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error opening chat from notification:', error);
      showToast('Error opening chat', 'error');
    }
  };

  const getNotificationLink = (notification: NotificationDto): string => {
    switch (notification.type) {
      case 1: // Follow
        return `/profile/${notification.relatedEntityId}`;
      case 2: // Message
        return '#'; // Will be handled by onClick
      case 3: // Comment
      case 4: // Rating
      case 5: // Favorite
        return '#'; // Navigate to related travel plan
      case 6: // GroupInvitation
        return `/groups/${notification.relatedEntityId}`;
      default:
        return '#';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);

    // Use relative time for recent notifications, full date for older ones
    if (days < 7) {
      return getRelativeTime(dateString);
    }
    return formatLocalDate(dateString);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            loadNotifications();
          }
        }}
        className="relative p-2 text-gray-700 hover:text-[#1C4633] transition-colors"
        aria-label="Notifications"
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
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[420px] bg-white rounded-xl shadow-2xl border border-gray-100 z-50 max-h-[600px] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#1C4633] to-[#2a5f45]">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <h3 className="font-semibold text-white text-lg">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-white/80 hover:text-white transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#1C4633] border-t-transparent"></div>
                <p className="mt-2 text-gray-500 text-sm">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">No notifications yet</p>
                <p className="text-gray-400 text-sm mt-1">We'll notify you when something happens</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.notificationID}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onAcceptInvitation={handleAcceptGroupInvitation}
                    onRejectInvitation={handleRejectGroupInvitation}
                    onMessageClick={handleMessageNotificationClick}
                    onNavigate={(link) => {
                      router.push(link);
                      setIsOpen(false);
                    }}
                    formatTime={formatTime}
                    getNotificationLink={getNotificationLink}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Notification type icons and colors
const getNotificationStyle = (type: number) => {
  switch (type) {
    case 1: // Follow
      return {
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        ),
        bgColor: 'bg-blue-100',
        iconColor: 'text-blue-600',
        label: 'New Follower'
      };
    case 2: // Message
      return {
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        ),
        bgColor: 'bg-purple-100',
        iconColor: 'text-purple-600',
        label: 'Message'
      };
    case 3: // Comment
      return {
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        ),
        bgColor: 'bg-green-100',
        iconColor: 'text-green-600',
        label: 'Comment'
      };
    case 4: // Rating
      return {
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ),
        bgColor: 'bg-yellow-100',
        iconColor: 'text-yellow-600',
        label: 'Rating'
      };
    case 5: // Favorite
      return {
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        ),
        bgColor: 'bg-red-100',
        iconColor: 'text-red-500',
        label: 'Favorite'
      };
    case 6: // GroupInvitation
      return {
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
        bgColor: 'bg-orange-100',
        iconColor: 'text-orange-600',
        label: 'Group Invitation'
      };
    default:
      return {
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        ),
        bgColor: 'bg-gray-100',
        iconColor: 'text-gray-600',
        label: 'Notification'
      };
  }
};

interface NotificationItemProps {
  notification: NotificationDto;
  onMarkAsRead: (id: number) => Promise<void>;
  onAcceptInvitation: (notificationId: number, groupId: string) => Promise<void>;
  onRejectInvitation: (notificationId: number) => Promise<void>;
  onMessageClick: (notification: NotificationDto) => Promise<void>;
  onNavigate: (link: string) => void;
  formatTime: (dateString: string) => string;
  getNotificationLink: (notification: NotificationDto) => string;
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onAcceptInvitation,
  onRejectInvitation,
  onMessageClick,
  onNavigate,
  formatTime,
  getNotificationLink
}: NotificationItemProps) {
  const style = getNotificationStyle(notification.type);

  const handleClick = async () => {
    if (notification.type === 2) {
      await onMessageClick(notification);
    } else {
      const link = getNotificationLink(notification);
      if (link && link !== '#') {
        onNavigate(link);
      }
      await onMarkAsRead(notification.notificationID);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`block p-4 hover:bg-white transition-all duration-200 cursor-pointer border-l-4 ${
        !notification.isRead 
          ? 'border-l-[#1C4633] bg-white shadow-sm' 
          : 'border-l-transparent bg-gray-50/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${style.bgColor} ${style.iconColor} flex items-center justify-center`}>
          {style.icon}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bgColor} ${style.iconColor}`}>
              {style.label}
            </span>
            {!notification.isRead && (
              <span className="w-2 h-2 rounded-full bg-[#1C4633] animate-pulse"></span>
            )}
          </div>
          <p className={`text-sm ${!notification.isRead ? 'text-gray-800' : 'text-gray-600'}`}>
            {notification.message}
          </p>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatTime(notification.createdAt)}
          </p>
          
          {/* Group Invitation Actions */}
          {notification.type === 6 && notification.relatedEntityId && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAcceptInvitation(notification.notificationID, notification.relatedEntityId!);
                }}
                className="px-4 py-2 bg-gradient-to-r from-[#1C4633] to-[#2a5f45] text-white text-sm rounded-lg hover:shadow-md transition-all duration-200 font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Accept
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRejectInvitation(notification.notificationID);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Decline
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

