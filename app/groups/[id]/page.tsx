'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import Header from '@/app/components/Header';
import Sidebar from '@/app/components/Sidebar';
import { groupsApi, GroupDto, UserGroupDto } from '@/lib/api/groups';
import { followApi, UserProfileSummaryDto } from '@/lib/api/follow';
import { groupEventsApi, GroupEventDto, CreateGroupEventDto } from '@/lib/api/groupEvents';
import { travelPlansApi, TravelPlanDto } from '@/lib/api/travelPlans';
import DeleteConfirmationModal from '@/app/components/DeleteConfirmationModal';
import { formatLocalDateTime } from '@/lib/utils/dateUtils';

const routeTypeLabels: Record<number, string> = {
  1: 'Trip',
  2: 'Hiking',
};

const difficultyLabels: Record<number, string> = {
  1: 'Easy',
  2: 'Medium',
  3: 'Hard',
};

const difficultyColors: Record<number, string> = {
  1: 'bg-green-100 text-green-700',
  2: 'bg-yellow-100 text-yellow-700',
  3: 'bg-red-100 text-red-700',
};

const getImageUrl = (imageUrl?: string | null) => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${process.env.NEXT_PUBLIC_API_URL || 'http://13.53.168.27:5000'}${imageUrl}`;
};

export default function GroupDetailPage() {
  const { isAuthenticated, isLoading: authLoading, user, isAdmin: isSiteAdmin } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const groupId = parseInt(params.id as string);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [group, setGroup] = useState<GroupDto | null>(null);
  const [members, setMembers] = useState<UserGroupDto[]>([]);
  const [events, setEvents] = useState<GroupEventDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfileSummaryDto[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [invitedUserIds, setInvitedUserIds] = useState<Set<string>>(new Set()); // Track invited users
  const [travelPlans, setTravelPlans] = useState<TravelPlanDto[]>([]);
  const [isLoadingTravelPlans, setIsLoadingTravelPlans] = useState(false);
  
  // Create event form state
  const [eventForm, setEventForm] = useState<CreateGroupEventDto>({
    groupID: groupId,
    title: '',
    description: '',
    eventDate: '',
    endDate: null,
    travelPlanID: 0,
  });
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<GroupEventDto | null>(null);
  const [showDeleteEventConfirmModal, setShowDeleteEventConfirmModal] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [isUpdatingEvent, setIsUpdatingEvent] = useState(false);
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  // Auth check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Load group details
  useEffect(() => {
    if (isAuthenticated && groupId) {
      loadGroupDetails();
      setEventForm(prev => ({ ...prev, groupID: groupId }));
    }
  }, [isAuthenticated, groupId]);

  // Load travel plans when event modal opens
  useEffect(() => {
    if (showCreateEventModal && isAuthenticated) {
      loadTravelPlans();
    }
  }, [showCreateEventModal, isAuthenticated]);

  const loadGroupDetails = async () => {
    try {
      setIsLoading(true);
      const [groupData, membersData, eventsData] = await Promise.all([
        groupsApi.getById(groupId),
        groupsApi.getMembers(groupId),
        groupEventsApi.getGroupEvents(groupId).catch(() => []) // Load events, but don't fail if error
      ]);
      
      setGroup(groupData);
      setMembers(membersData);
      setEvents(eventsData);
      
      // Check if current user is creator (admin)
      if (groupData && user?.userId) {
        setIsAdmin(groupData.creatorId === user.userId);
      }
    } catch (error: any) {
      console.error('Error loading group details:', error);
      showToast('An error occurred while loading group details', 'error');
      router.push('/groups');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTravelPlans = async () => {
    try {
      setIsLoadingTravelPlans(true);
      // Load all travel plans (both user's own and others')
      const allPlans = await travelPlansApi.getAll();
      setTravelPlans(allPlans);
    } catch (error: any) {
      console.error('Error loading travel plans:', error);
      showToast('Error loading routes. Please try again.', 'error');
      setTravelPlans([]);
    } finally {
      setIsLoadingTravelPlans(false);
    }
  };

  const handleSearch = (query: string) => {
    // Search functionality can be added later
  };

  const handleBack = () => {
    router.push('/groups');
  };

  const handleLeaveGroup = async () => {
    try {
      await groupsApi.leave(groupId);
      showToast('Successfully left the group', 'success');
      router.push('/groups');
    } catch (error: any) {
      console.error('Error leaving group:', error);
      showToast(error.message || 'An error occurred while leaving the group', 'error');
    }
  };

  const handleDeleteGroup = async () => {
    try {
      setIsDeleting(true);
      await groupsApi.delete(groupId);
      showToast('Group deleted successfully', 'success');
      router.push('/groups');
    } catch (error: any) {
      console.error('Error deleting group:', error);
      showToast(error.message || 'An error occurred while deleting the group', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleJoinGroup = async () => {
    try {
      await groupsApi.join(groupId);
      showToast('Successfully joined the group', 'success');
      loadGroupDetails();
    } catch (error: any) {
      console.error('Error joining group:', error);
      showToast(error.message || 'An error occurred while joining the group', 'error');
    }
  };

  const handleSearchUsers = async () => {
    if (searchQuery.trim().length < 1) {
      showToast('Please enter at least 1 character to search', 'info');
      return;
    }
    
    setIsSearching(true);
    try {
      console.log('Searching for users with query:', searchQuery.trim());
      const results = await followApi.searchUsers(searchQuery.trim());
      console.log('Search results:', results);
      setSearchResults(results);
      
      if (results.length === 0) {
        showToast('No users found', 'info');
      }
    } catch (error: any) {
      console.error('Error searching users:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      showToast(error.message || 'Error searching users', 'error');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInviteUser = async (userId: string) => {
    try {
      await groupsApi.invite(groupId, userId);
      showToast('Invitation sent successfully! The user will receive a notification.', 'success');
      // Add user to invited list
      setInvitedUserIds(prev => new Set(prev).add(userId));
    } catch (error: any) {
      console.error('Error inviting user:', error);
      const errorMessage = error.message || 'Error sending invitation';
      showToast(errorMessage, 'error');
    }
  };

  const handleCreateEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.eventDate || !eventForm.travelPlanID) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      setIsCreatingEvent(true);
      await groupEventsApi.createEvent({
        ...eventForm,
        groupID: groupId,
      });
      showToast('Event created successfully', 'success');
      setShowCreateEventModal(false);
      setEventForm({
        groupID: groupId,
        title: '',
        description: '',
        eventDate: '',
        endDate: null,
        travelPlanID: 0,
      });
      loadGroupDetails();
    } catch (error: any) {
      console.error('Error creating event:', error);
      showToast(error.message || 'Error creating event', 'error');
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleJoinEvent = async (eventId: number) => {
    try {
      await groupEventsApi.joinEvent(eventId);
      showToast('Successfully joined the event', 'success');
      loadGroupDetails();
    } catch (error: any) {
      console.error('Error joining event:', error);
      showToast(error.message || 'Error joining event', 'error');
    }
  };

  const handleLeaveEvent = async (eventId: number) => {
    try {
      await groupEventsApi.leaveEvent(eventId);
      showToast('Successfully left the event', 'success');
      loadGroupDetails();
    } catch (error: any) {
      console.error('Error leaving event:', error);
      showToast(error.message || 'Error leaving event', 'error');
    }
  };

  const handleEditEvent = (event: GroupEventDto) => {
    setEditingEvent(event);
    setEventForm({
      groupID: groupId,
      title: event.title,
      description: event.description || '',
      eventDate: new Date(event.eventDate).toISOString().slice(0, 16),
      endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : null,
      travelPlanID: event.travelPlanID,
    });
    setShowEditEventModal(true);
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent || !eventForm.title.trim() || !eventForm.eventDate || !eventForm.travelPlanID) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      setIsUpdatingEvent(true);
      await groupEventsApi.updateEvent(editingEvent.groupEventID, {
        ...eventForm,
        groupID: groupId,
      });
      showToast('Event updated successfully', 'success');
      setShowEditEventModal(false);
      setEditingEvent(null);
      setEventForm({
        groupID: groupId,
        title: '',
        description: '',
        eventDate: '',
        endDate: null,
        travelPlanID: 0,
      });
      loadGroupDetails();
    } catch (error: any) {
      console.error('Error updating event:', error);
      showToast(error.message || 'Error updating event', 'error');
    } finally {
      setIsUpdatingEvent(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!deletingEventId) return;

    try {
      setIsDeletingEvent(true);
      await groupEventsApi.deleteEvent(deletingEventId);
      showToast('Event deleted successfully', 'success');
      setShowDeleteEventConfirmModal(false);
      setDeletingEventId(null);
      loadGroupDetails();
    } catch (error: any) {
      console.error('Error deleting event:', error);
      showToast(error.message || 'Error deleting event', 'error');
    } finally {
      setIsDeletingEvent(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      setIsRemovingMember(true);
      await groupsApi.removeMember(groupId, memberToRemove.id);
      showToast('Member removed successfully', 'success');
      setShowRemoveMemberModal(false);
      setMemberToRemove(null);
      loadGroupDetails();
    } catch (error: any) {
      console.error('Error removing member:', error);
      showToast(error.message || 'Error removing member', 'error');
    } finally {
      setIsRemovingMember(false);
    }
  };

  const formatDate = (dateString: string) => {
    return formatLocalDateTime(dateString);
  };

  const isMember = members.some(m => m.userID === user?.userId);

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F4F2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1C4633] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !group) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F4F4F2] flex flex-col">
      <Header onSearch={handleSearch} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 lg:ml-64 transition-all duration-300 overflow-y-auto">
          <div className="max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            {/* Header with Back Button */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={handleBack}
                  className="flex items-center justify-center w-10 h-10 text-[#1C4633] hover:bg-[#1C4633]/10 rounded-lg transition-colors"
                  aria-label="Go back"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <h1 className="text-3xl font-bold text-[#1C4633]">{group.name}</h1>
              </div>
              {group.description && (
                <p className="text-gray-600 mb-4">{group.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  {group.memberCount} members
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  group.isPublic 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {group.isPublic ? 'Public' : 'Private'}
                </span>
                {isAdmin && (
                  <span className="flex items-center gap-1.5 text-xs text-gray-600">
                    <svg
                      className="w-4 h-4 text-[#DA922B]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    Admin
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mb-6 flex gap-4 items-center flex-wrap">
              {(isAdmin || isSiteAdmin) && (
                <button
                  onClick={() => setShowAddMembersModal(true)}
                  className="px-6 py-3 bg-[#1C4633] text-white rounded-lg hover:bg-[#1C4633]/90 transition-all shadow-md hover:shadow-lg font-medium flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Invite Members
                </button>
              )}
              
              {/* Site Admin Badge & Delete */}
              {isSiteAdmin && !isAdmin && (
                <>
                  <span className="px-3 py-2 bg-[#DA922B]/10 text-[#DA922B] text-sm font-medium rounded-lg flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Site Admin
                  </span>
                  <button
                    onClick={() => setShowDeleteConfirmModal(true)}
                    disabled={isDeleting}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-md hover:shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {isDeleting ? 'Deleting...' : 'Delete Group'}
                  </button>
                </>
              )}

              {isMember ? (
                isAdmin ? (
                  <button
                    onClick={() => setShowDeleteConfirmModal(true)}
                    disabled={isDeleting}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-md hover:shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Group'}
                  </button>
                ) : (
                  <button
                    onClick={() => setShowLeaveConfirmModal(true)}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-md hover:shadow-lg font-medium"
                  >
                    Leave Group
                  </button>
                )
              ) : !isSiteAdmin && (
                <button
                  onClick={handleJoinGroup}
                  className="px-6 py-3 bg-[#DA922B] text-white rounded-lg hover:bg-[#DA922B]/90 transition-all shadow-md hover:shadow-lg font-medium"
                >
                  Join Group
                </button>
              )}
            </div>

            {/* Events Section */}
            <div className="bg-white rounded-xl shadow-lg border border-[#1C4633]/20 p-6 mb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#1C4633] flex items-center gap-3">
                  <div className="p-2 bg-[#1C4633]/10 rounded-lg">
                    <svg className="w-6 h-6 text-[#1C4633]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  Events
                  <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{events.length}</span>
                </h2>
                {isAdmin && (
                  <button
                    onClick={() => setShowCreateEventModal(true)}
                    className="px-4 py-2 bg-[#1C4633] text-white rounded-lg hover:bg-[#1C4633]/90 transition-all shadow-md hover:shadow-lg font-medium flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Event
                  </button>
                )}
              </div>
              
              {events.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">No events scheduled yet</p>
                  <p className="text-gray-400 text-sm mt-1">Create an event to plan activities with group members</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {events.map((event) => {
                    const eventDate = new Date(event.eventDate);
                    const isPast = eventDate < new Date();
                    
                    return (
                      <div
                        key={event.groupEventID}
                        className={`group relative flex gap-4 p-4 rounded-xl transition-all hover:shadow-md ${
                          isPast ? 'bg-gray-50 opacity-75' : 'bg-gradient-to-r from-[#1C4633]/5 to-transparent hover:from-[#1C4633]/10'
                        }`}
                      >
                        {/* Left Side: Route Card like TravelPlanCard */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/routes/${event.travelPlanID}`);
                          }}
                          className="w-40 h-48 flex-shrink-0 bg-white border border-gray-200 rounded-xl cursor-pointer hover:shadow-lg transition-all overflow-hidden relative group/route"
                        >
                          {/* Cover Image */}
                          <div className="relative w-full h-28 bg-gradient-to-br from-[#F8F9FA] via-[#F4F4F2] to-[#E9ECEF] overflow-hidden">
                            {event.travelPlanCoverImageUrl ? (
                              <>
                                <img 
                                  src={getImageUrl(event.travelPlanCoverImageUrl) || ''} 
                                  alt={event.travelPlanTitle || 'Route'}
                                  className="w-full h-full object-cover group-hover/route:scale-110 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                              </>
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <svg 
                                  className="w-12 h-12 text-[#1C4633]/50 group-hover/route:scale-110 transition-transform" 
                                  fill="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          
                          {/* Route Info */}
                          <div className="p-2.5">
                            <h4 className="text-sm font-semibold text-[#1C4633] line-clamp-2 leading-tight group-hover/route:text-[#DA922B] transition-colors">
                              {event.travelPlanTitle || 'Route'}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <svg className="w-3.5 h-3.5 text-[#DA922B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                              </svg>
                              <span className="text-xs text-[#DA922B] font-medium">View Route</span>
                            </div>
                          </div>
                        </div>

                        {/* Right Side: Event Content */}
                        <div className="flex-1 min-w-0 flex flex-col">
                          {/* Top Row: Date Badge + Info */}
                          <div className="flex items-center gap-4 mb-2 flex-wrap">
                            {/* Date Badge - Horizontal */}
                            <div className={`px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm ${
                              isPast ? 'bg-gray-200 text-gray-500' : 'bg-[#1C4633] text-white'
                            }`}>
                              <span className="text-sm font-bold">
                                {eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                              <span className="text-xs opacity-75">
                                {eventDate.toLocaleDateString('en-US', { weekday: 'short' })}
                              </span>
                            </div>
                            
                            {/* Time, Participants, Creator - Horizontal */}
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1.5">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                {event.currentParticipants} participants
                              </span>
                              <span className="text-gray-500">by {event.createdByUserName}</span>
                            </div>

                            {/* Action Buttons - Right aligned */}
                            <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                              {event.createdByUserId === user?.userId && (
                                <>
                                  <button
                                    onClick={() => handleEditEvent(event)}
                                    className="p-2 text-gray-400 hover:text-[#DA922B] hover:bg-[#DA922B]/10 rounded-lg transition-colors"
                                    title="Edit event"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeletingEventId(event.groupEventID);
                                      setShowDeleteEventConfirmModal(true);
                                    }}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete event"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </>
                              )}
                              {isMember && !isPast && (
                                event.isUserParticipating ? (
                                  <button
                                    onClick={() => handleLeaveEvent(event.groupEventID)}
                                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                  >
                                    Leave
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleJoinEvent(event.groupEventID)}
                                    className="px-4 py-2 text-sm font-medium text-white bg-[#1C4633] hover:bg-[#1C4633]/90 rounded-lg transition-colors shadow-sm"
                                  >
                                    Join
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                          
                          {/* Title and Description */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-bold text-lg text-[#1C4633]">{event.title}</h3>
                              {isPast && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 rounded-full">Past</span>
                              )}
                              {event.isUserParticipating && !isPast && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  Joined
                                </span>
                              )}
                            </div>
                            
                            {event.description && (
                              <p className="text-gray-600 text-sm line-clamp-2">{event.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Members Section */}
            <div className="bg-white rounded-xl shadow-lg border border-[#1C4633]/20 p-6">
              <h2 className="text-2xl font-bold text-[#1C4633] mb-4">Members ({members.length})</h2>
              {members.length === 0 ? (
                <p className="text-gray-600">No members in this group yet.</p>
              ) : (
                <div className="space-y-4">
                  {members.map((member) => {
                    const isCurrentUser = member.userID === user?.userId;
                    const isMemberAdmin = member.userID === group?.creatorId;
                    const canRemove = isAdmin && !isCurrentUser && !isMemberAdmin;
                    
                    return (
                      <div
                        key={member.userID}
                        className={`flex items-center gap-4 p-4 rounded-lg cursor-pointer hover:bg-[#1C4633]/10 transition-colors ${
                          isCurrentUser ? 'bg-[#1C4633]/5 border-2 border-[#1C4633]' : 'bg-gray-50'
                        }`}
                        onClick={() => router.push(`/profile/${member.userID}`)}
                      >
                        {/* Avatar */}
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-white shadow-sm ${
                          getImageUrl(member.profileImageUrl) ? 'bg-white' : 'bg-gradient-to-br from-[#1C4633] to-[#DA922B]'
                        }`}>
                          {getImageUrl(member.profileImageUrl) ? (
                            <img src={getImageUrl(member.profileImageUrl)!} alt={member.userName || 'User'} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white text-lg font-bold">
                              {member.userName?.[0]?.toUpperCase() || 'U'}
                            </span>
                          )}
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg text-[#1C4633] truncate">
                              {member.userName}
                              {isCurrentUser && (
                                <span className="ml-2 text-sm text-gray-500">(You)</span>
                              )}
                            </h3>
                            {isMemberAdmin && (
                              <span className="px-2 py-1 bg-[#DA922B] text-white text-xs font-semibold rounded">
                                Admin
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Remove Button - Only for admin, not for current user or group creator */}
                        {canRemove && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card click
                              setMemberToRemove({ id: member.userID, name: member.userName || 'this member' });
                              setShowRemoveMemberModal(true);
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-md hover:shadow-lg text-sm font-medium flex items-center gap-1.5"
                            title="Remove member from group"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Invite Members Modal */}
            {showAddMembersModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-[#1C4633]/20">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-[#1C4633] mb-1">Invite Members</h2>
                        <p className="text-gray-600 text-sm">
                          {group?.isPublic 
                            ? 'Search for users and invite them to join this group'
                            : 'Only you can invite members to this private group'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setShowAddMembersModal(false);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-2 transition-colors"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Search Bar */}
                    <div className="mb-6">
                      <div className="relative">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter' && searchQuery.trim().length >= 1) {
                              await handleSearchUsers();
                            }
                          }}
                          placeholder="Search by username or email..."
                          className="w-full px-4 py-3 pl-12 border border-[#1C4633]/30 rounded-lg focus:ring-2 focus:ring-[#1C4633]/20 focus:border-[#1C4633] outline-none transition-all text-gray-900"
                          autoFocus
                        />
                        <svg
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#1C4633]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <button
                        onClick={handleSearchUsers}
                        disabled={searchQuery.trim().length < 1 || isSearching}
                        className="mt-3 w-full px-4 py-3 bg-[#1C4633] text-white rounded-lg hover:bg-[#1C4633]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg font-medium"
                      >
                        {isSearching ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Searching...
                          </span>
                        ) : (
                          'Search Users'
                        )}
                      </button>
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-gray-700 text-lg">Search Results</h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {searchResults
                            .filter(u => !members.some(m => m.userID === u.userId) && u.userId !== user?.userId)
                            .map((user) => (
                              <div
                                key={user.userId}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                              >
                                <div className="flex items-center gap-4 flex-1">
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-white shadow-sm ${
                                    getImageUrl(user.profileImageUrl) ? 'bg-white' : 'bg-gradient-to-br from-[#1C4633] to-[#DA922B]'
                                  }`}>
                                    {getImageUrl(user.profileImageUrl) ? (
                                      <img src={getImageUrl(user.profileImageUrl)!} alt={user.userName || 'User'} className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-white font-bold text-lg">
                                        {user.userName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">{user.userName || 'Unknown User'}</p>
                                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                                    {user.bio && (
                                      <p className="text-xs text-gray-400 mt-1 truncate">{user.bio}</p>
                                    )}
                                  </div>
                                </div>
                                {invitedUserIds.has(user.userId) ? (
                                  <button
                                    disabled
                                    className="ml-4 px-5 py-2 bg-gray-300 text-gray-600 rounded-lg text-sm font-medium whitespace-nowrap flex items-center gap-2 cursor-not-allowed"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Invite Sent
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleInviteUser(user.userId)}
                                    className="ml-4 px-5 py-2 bg-[#DA922B] text-white rounded-lg hover:bg-[#DA922B]/90 text-sm font-medium transition-all shadow-md hover:shadow-lg whitespace-nowrap flex items-center gap-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Invite
                                  </button>
                                )}
                              </div>
                            ))}
                          {searchResults.filter(u => !members.some(m => m.userID === u.userId) && u.userId !== user?.userId).length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                              <p>All found users are already members of this group</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {searchQuery.trim().length >= 1 && searchResults.length === 0 && !isSearching && (
                      <div className="text-center py-12 text-gray-500">
                        <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p className="text-lg font-medium mb-2">No users found</p>
                        <p className="text-sm">Try a different search term</p>
                      </div>
                    )}

                    {searchQuery.trim().length === 0 && searchResults.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p className="text-lg font-medium mb-2">Search for users to invite</p>
                        <p className="text-sm">Enter a username or email address above</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Create Event Modal */}
            {showCreateEventModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-2xl font-bold text-[#1C4633]">Create Event</h2>
                      <button
                        onClick={() => {
                          setShowCreateEventModal(false);
                          setEventForm({
                            groupID: groupId,
                            title: '',
                            description: '',
                            eventDate: '',
                            endDate: null,
                            travelPlanID: 0,
                          });
                        }}
                        className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-2 transition-colors"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Event Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={eventForm.title}
                          onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                          placeholder="e.g., Weekend Hiking Trip to Mount X"
                          className="w-full px-4 py-3 border border-[#1C4633]/30 rounded-lg focus:ring-2 focus:ring-[#1C4633]/20 focus:border-[#1C4633] outline-none transition-all text-gray-900"
                          required
                          autoFocus
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          value={eventForm.description}
                          onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                          placeholder="Describe the event, meeting point, what to bring, etc..."
                          rows={4}
                          className="w-full px-4 py-3 border border-[#1C4633]/30 rounded-lg focus:ring-2 focus:ring-[#1C4633]/20 focus:border-[#1C4633] outline-none transition-all text-gray-900 resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Route <span className="text-red-500">*</span>
                        </label>
                        <p className="text-xs text-gray-500 mb-3">
                          Choose a route that the group will follow for this event
                        </p>
                        {isLoadingTravelPlans ? (
                          <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1C4633]"></div>
                            <span className="ml-2 text-gray-600">Loading routes...</span>
                          </div>
                        ) : travelPlans.length === 0 ? (
                          <div className="w-full px-4 py-3 border border-yellow-300 rounded-lg bg-yellow-50 text-yellow-800 text-sm">
                            No routes available. Please create a route first.
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-80 overflow-y-auto border border-[#1C4633]/30 rounded-lg p-2">
                            {travelPlans.map((plan) => (
                              <label
                                key={plan.travelPlanID}
                                className={`flex items-start p-4 cursor-pointer rounded-lg border-2 transition-all hover:bg-gray-50 ${
                                  eventForm.travelPlanID === plan.travelPlanID
                                    ? 'border-[#1C4633] bg-[#1C4633]/5'
                                    : 'border-transparent hover:border-gray-300'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="travelPlan"
                                  value={plan.travelPlanID}
                                  checked={eventForm.travelPlanID === plan.travelPlanID}
                                  onChange={(e) => setEventForm({ ...eventForm, travelPlanID: parseInt(e.target.value) })}
                                  className="mt-1 mr-4 text-[#1C4633] focus:ring-[#1C4633]"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold text-gray-900">{plan.title}</h4>
                                    {plan.creatorId === user?.userId && (
                                      <span className="px-2 py-0.5 bg-[#1C4633] text-white text-xs font-semibold rounded">
                                        My Route
                                      </span>
                                    )}
                                  </div>
                                  {plan.description && (
                                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{plan.description}</p>
                                  )}
                                  <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                                      {routeTypeLabels[plan.type] || 'Unknown'}
                                    </span>
                                    <span className={`px-2 py-1 rounded font-medium ${difficultyColors[plan.difficulty] || 'bg-gray-100 text-gray-700'}`}>
                                      {difficultyLabels[plan.difficulty] || 'Unknown'}
                                    </span>
                                    {plan.totalDistanceInMeters && (
                                      <span className="flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                        {(plan.totalDistanceInMeters / 1000).toFixed(1)} km
                                      </span>
                                    )}
                                    <span>by {plan.creatorName}</span>
                                    {plan.averageRating > 0 && (
                                      <span className="flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                        {plan.averageRating.toFixed(1)} ({plan.totalRatings})
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      window.open(`/routes/${plan.travelPlanID}`, '_blank');
                                    }}
                                    className="mt-2 text-xs text-[#1C4633] hover:text-[#1C4633]/80 hover:underline font-medium"
                                  >
                                    View route details →
                                  </button>
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Event Date & Time <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="datetime-local"
                            value={eventForm.eventDate}
                            onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })}
                            className="w-full px-4 py-3 border border-[#1C4633]/30 rounded-lg focus:ring-2 focus:ring-[#1C4633]/20 focus:border-[#1C4633] outline-none transition-all text-gray-900"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            End Date & Time (Optional)
                          </label>
                          <input
                            type="datetime-local"
                            value={eventForm.endDate || ''}
                            onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value || null })}
                            className="w-full px-4 py-3 border border-[#1C4633]/30 rounded-lg focus:ring-2 focus:ring-[#1C4633]/20 focus:border-[#1C4633] outline-none transition-all text-gray-900"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button
                          onClick={handleCreateEvent}
                          disabled={isCreatingEvent || !eventForm.travelPlanID}
                          className="flex-1 px-6 py-3 bg-[#1C4633] text-white rounded-lg hover:bg-[#1C4633]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg font-medium"
                        >
                          {isCreatingEvent ? (
                            <span className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Creating...
                            </span>
                          ) : (
                            'Create Event'
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setShowCreateEventModal(false);
                            setEventForm({
                              groupID: groupId,
                              title: '',
                              description: '',
                              eventDate: '',
                              endDate: null,
                              travelPlanID: 0,
                            });
                          }}
                          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Leave Group Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showLeaveConfirmModal}
        onClose={() => setShowLeaveConfirmModal(false)}
        onConfirm={handleLeaveGroup}
        title="Leave Group"
        message="Are you sure you want to leave this group? You will need to be invited again to rejoin."
        itemName={group?.name}
        confirmButtonText="Leave"
        confirmButtonColor="orange"
      />

      {/* Delete Group Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        onConfirm={handleDeleteGroup}
        title="Delete Group"
        message="Are you sure you want to delete this group? This action cannot be undone. All events and members will be removed."
        itemName={group?.name}
      />

      {/* Edit Event Modal */}
      {showEditEventModal && editingEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-[#1C4633]/20">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#1C4633] mb-1">Edit Event</h2>
                  <p className="text-gray-600 text-sm">Update event details</p>
                </div>
                <button
                  onClick={() => {
                    setShowEditEventModal(false);
                    setEditingEvent(null);
                    setEventForm({
                      groupID: groupId,
                      title: '',
                      description: '',
                      eventDate: '',
                      endDate: null,
                      travelPlanID: 0,
                    });
                  }}
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    placeholder="e.g., Weekend Hiking Trip to Mount X"
                    className="w-full px-4 py-3 border border-[#1C4633]/30 rounded-lg focus:ring-2 focus:ring-[#1C4633]/20 focus:border-[#1C4633] outline-none transition-all text-gray-900"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    placeholder="Describe the event, meeting point, what to bring, etc..."
                    rows={4}
                    className="w-full px-4 py-3 border border-[#1C4633]/30 rounded-lg focus:ring-2 focus:ring-[#1C4633]/20 focus:border-[#1C4633] outline-none transition-all text-gray-900 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Route <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Choose a route that the group will follow for this event
                  </p>
                  {isLoadingTravelPlans ? (
                    <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1C4633]"></div>
                      <span className="ml-2 text-gray-600">Loading routes...</span>
                    </div>
                  ) : travelPlans.length === 0 ? (
                    <div className="w-full px-4 py-3 border border-yellow-300 rounded-lg bg-yellow-50 text-yellow-800 text-sm">
                      No routes available. Please create a route first.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto border border-[#1C4633]/30 rounded-lg p-2">
                      {travelPlans.map((plan) => (
                        <label
                          key={plan.travelPlanID}
                          className={`flex items-start p-4 cursor-pointer rounded-lg border-2 transition-all hover:bg-gray-50 ${
                            eventForm.travelPlanID === plan.travelPlanID
                              ? 'border-[#1C4633] bg-[#1C4633]/5'
                              : 'border-transparent hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="travelPlanEdit"
                            value={plan.travelPlanID}
                            checked={eventForm.travelPlanID === plan.travelPlanID}
                            onChange={(e) => setEventForm({ ...eventForm, travelPlanID: parseInt(e.target.value) })}
                            className="mt-1 mr-4 text-[#1C4633] focus:ring-[#1C4633]"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900">{plan.title}</h4>
                              {plan.creatorId === user?.userId && (
                                <span className="px-2 py-0.5 bg-[#1C4633] text-white text-xs font-semibold rounded">
                                  My Route
                                </span>
                              )}
                            </div>
                            {plan.description && (
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{plan.description}</p>
                            )}
                            <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                                {routeTypeLabels[plan.type] || 'Unknown'}
                              </span>
                              <span className={`px-2 py-1 rounded font-medium ${difficultyColors[plan.difficulty] || 'bg-gray-100 text-gray-700'}`}>
                                {difficultyLabels[plan.difficulty] || 'Unknown'}
                              </span>
                              {plan.totalDistanceInMeters && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                  </svg>
                                  {(plan.totalDistanceInMeters / 1000).toFixed(1)} km
                                </span>
                              )}
                              <span>by {plan.creatorName}</span>
                              {plan.averageRating > 0 && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                  {plan.averageRating.toFixed(1)} ({plan.totalRatings})
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.open(`/routes/${plan.travelPlanID}`, '_blank');
                              }}
                              className="mt-2 text-xs text-[#1C4633] hover:text-[#1C4633]/80 hover:underline font-medium"
                            >
                              View route details →
                            </button>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Event Date & Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={eventForm.eventDate}
                      onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })}
                      className="w-full px-4 py-3 border border-[#1C4633]/30 rounded-lg focus:ring-2 focus:ring-[#1C4633]/20 focus:border-[#1C4633] outline-none transition-all text-gray-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date & Time (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={eventForm.endDate || ''}
                      onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value || null })}
                      className="w-full px-4 py-3 border border-[#1C4633]/30 rounded-lg focus:ring-2 focus:ring-[#1C4633]/20 focus:border-[#1C4633] outline-none transition-all text-gray-900"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleUpdateEvent}
                    disabled={isUpdatingEvent || !eventForm.travelPlanID}
                    className="flex-1 px-6 py-3 bg-[#1C4633] text-white rounded-lg hover:bg-[#1C4633]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg font-medium"
                  >
                    {isUpdatingEvent ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Updating...
                      </span>
                    ) : (
                      'Update Event'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowEditEventModal(false);
                      setEditingEvent(null);
                      setEventForm({
                        groupID: groupId,
                        title: '',
                        description: '',
                        eventDate: '',
                        endDate: null,
                        travelPlanID: 0,
                      });
                    }}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Event Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteEventConfirmModal}
        onClose={() => {
          setShowDeleteEventConfirmModal(false);
          setDeletingEventId(null);
        }}
        onConfirm={handleDeleteEvent}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone."
        itemName={events.find(e => e.groupEventID === deletingEventId)?.title}
      />

      {/* Remove Member Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showRemoveMemberModal}
        onClose={() => {
          setShowRemoveMemberModal(false);
          setMemberToRemove(null);
        }}
        onConfirm={handleRemoveMember}
        title="Remove Member"
        message="Are you sure you want to remove this member from the group? They will need to be invited again to rejoin."
        itemName={memberToRemove?.name}
      />
    </div>
  );
}

