'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import Header from '@/app/components/Header';
import Sidebar from '@/app/components/Sidebar';
import { groupsApi, GroupDto, CreateGroupDto } from '@/lib/api/groups';

export default function GroupsPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [groups, setGroups] = useState<GroupDto[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<GroupDto[]>([]);
  const [userGroups, setUserGroups] = useState<GroupDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupForm, setGroupForm] = useState<CreateGroupDto>({
    name: '',
    description: '',
    isPublic: true,
  });
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Auth check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Load groups
  useEffect(() => {
    if (isAuthenticated) {
      loadGroups();
    }
  }, [isAuthenticated]);

  // Apply search filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredGroups(groups);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = groups.filter(
      (group) =>
        group.name.toLowerCase().includes(query) ||
        group.description?.toLowerCase().includes(query)
    );
    setFilteredGroups(filtered);
  }, [searchQuery, groups]);

  const loadGroups = async () => {
    try {
      setIsLoading(true);
      console.log('Loading groups...');
      const allGroups = await groupsApi.getAll();
      console.log('Groups loaded successfully:', allGroups);
      setGroups(allGroups);
      setFilteredGroups(allGroups);
      
      // Load user's groups (groups where user is a member)
      await loadUserGroups();
    } catch (error: any) {
      console.error('=== ERROR LOADING GROUPS ===');
      console.error('Error object:', error);
      console.error('Error message:', error.message);
      console.error('Error status:', error.status);
      console.error('Error response:', error.response);
      console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      
      let errorMessage = 'An error occurred while loading groups';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      showToast(errorMessage, 'error');
      setGroups([]);
      setFilteredGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserGroups = async () => {
    try {
      const userGroupsList = await groupsApi.getMyGroups();
      setUserGroups(userGroupsList);
    } catch (error) {
      console.error('Error loading user groups:', error);
      setUserGroups([]);
    }
  };


  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleJoinGroup = async (groupId: number) => {
    try {
      await groupsApi.join(groupId);
      showToast('Successfully joined the group', 'success');
      loadGroups(); // Refresh groups to update member count
    } catch (error: any) {
      console.error('Error joining group:', error);
      showToast(error.message || 'An error occurred while joining the group', 'error');
    }
  };

  const handleLeaveGroup = async (groupId: number) => {
    try {
      await groupsApi.leave(groupId);
      showToast('Successfully left the group', 'success');
      loadGroups(); // Refresh groups to update member count
    } catch (error: any) {
      console.error('Error leaving group:', error);
      showToast(error.message || 'An error occurred while leaving the group', 'error');
    }
  };

  const handleViewGroup = (groupId: number) => {
    router.push(`/groups/${groupId}`);
  };

  const handleCreateGroup = async () => {
    if (!groupForm.name.trim()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      setIsCreatingGroup(true);
      const newGroup = await groupsApi.create(groupForm);
      showToast('Group created successfully', 'success');
      setShowCreateGroupModal(false);
      setGroupForm({
        name: '',
        description: '',
        isPublic: true,
      });
      // Reload groups (creator is automatically added as member)
      await loadGroups();
    } catch (error: any) {
      console.error('Error creating group:', error);
      showToast(error.message || 'Error creating group', 'error');
    } finally {
      setIsCreatingGroup(false);
    }
  };

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

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-[#F4F4F2] flex flex-col">
      <Header onSearch={handleSearch} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 lg:ml-64 transition-all duration-300 overflow-y-auto">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden fixed top-20 left-4 z-50 p-2 bg-white rounded-lg shadow-md hover:bg-[#F4F4F2] transition-colors border border-[#1C4633]/20"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6 text-[#1C4633]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {sidebarOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>

          {/* Content Area */}
          <div className="p-4 md:p-6">
            {/* Page Header / Toolbar */}
            <div className="bg-white rounded-lg border border-[#1C4633]/20 p-4 md:p-6 mb-6 shadow-sm">
              <div className="flex flex-col gap-6">
                {/* Page Title */}
                <div>
                  <h1 className="text-3xl font-bold text-[#1C4633] mb-2">Explore Groups</h1>
                  <p className="text-gray-600">Discover and join groups with similar interests</p>
                </div>
                
                {/* Unified Toolbar: Search, Create */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  {/* Search Bar - Takes available space */}
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search groups..."
                      className="w-full h-12 px-4 pl-12 bg-white border border-[#1C4633]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C4633]/20 focus:border-[#1C4633] text-gray-900 placeholder-gray-400 text-base shadow-sm"
                    />
                    <svg
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#1C4633]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>

                  {/* Create Group Button */}
                  <button
                    onClick={() => setShowCreateGroupModal(true)}
                    className="flex items-center justify-center gap-2 h-12 px-6 bg-[#DA922B] text-white rounded-lg hover:bg-[#DA922B]/90 transition-colors font-medium text-lg shadow-sm"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Create Group</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Search Results Count */}
            {filteredGroups.length > 0 && groups.length > 0 && searchQuery && (
              <div className="mb-4 text-sm text-gray-600 flex items-center gap-2">
                <span className="font-medium">Showing {filteredGroups.length}</span>
                <span>of</span>
                <span className="font-medium">{groups.length}</span>
                <span>groups</span>
              </div>
            )}

            {/* Groups Grid */}
            {filteredGroups.length === 0 ? (
              <div className="text-center py-20">
                <svg
                  className="w-24 h-24 text-gray-300 mx-auto mb-4"
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
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  {groups.length === 0 ? 'No groups yet' : 'No groups found'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {groups.length === 0 
                    ? 'Create your first group!'
                    : searchQuery 
                      ? `No groups found matching "${searchQuery}". Try a different search term.`
                      : 'No groups match your current filters.'}
                </p>
                {groups.length === 0 && (
                  <button
                    onClick={() => setShowCreateGroupModal(true)}
                    className="inline-block px-6 py-3 bg-[#DA922B] text-white rounded-lg hover:bg-[#DA922B]/90 transition-colors font-medium"
                  >
                    Create First Group
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredGroups.map((group) => {
                  const isMember = userGroups.some(ug => ug.groupID === group.groupID);
                  return (
                    <div
                      key={group.groupID}
                      className="bg-white rounded-xl shadow-md border border-[#1C4633]/20 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group"
                      onClick={() => handleViewGroup(group.groupID)}
                    >
                      {/* Group Image/Icon Placeholder */}
                      <div className="relative w-full h-48 bg-gradient-to-br from-[#1C4633]/10 to-[#DA922B]/10 overflow-hidden">
                        <div className="w-full h-full flex items-center justify-center">
                          <svg
                            width="80"
                            height="80"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#1C4633"
                            strokeWidth="1.5"
                            className="opacity-40 group-hover:opacity-60 transition-opacity"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                        </div>
                        {isMember && (
                          <div className="absolute top-3 right-3 bg-[#1C4633] text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md">
                            Member
                          </div>
                        )}
                      </div>

                      {/* Group Info */}
                      <div className="p-5">
                        <h3 className="text-xl font-bold text-[#1C4633] mb-2 line-clamp-1 group-hover:text-[#DA922B] transition-colors">{group.name}</h3>
                        {group.description && (
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
                            {group.description}
                          </p>
                        )}
                        
                        {/* Tags */}
                        <div className="mb-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            group.isPublic 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {group.isPublic ? 'Public' : 'Private'}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                          <span className="flex items-center gap-2 text-sm text-gray-600">
                            <svg
                              className="w-5 h-5 text-[#1C4633]"
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
                            <span className="font-medium">{group.memberCount}</span>
                            <span className="text-gray-500">members</span>
                          </span>
                          <svg className="w-5 h-5 text-gray-400 group-hover:text-[#1C4633] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#1C4633]/20">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#1C4633]">Create New Group</h2>
                  <p className="text-gray-600 text-sm mt-1">Start a community around your interests</p>
                </div>
                <button
                  onClick={() => {
                    setShowCreateGroupModal(false);
                    setGroupForm({
                      name: '',
                      description: '',
                      activityTypeID: 0,
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
                    Group Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={groupForm.name}
                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                    placeholder="Enter group name"
                    className="w-full px-4 py-3 border border-[#1C4633]/30 rounded-lg focus:ring-2 focus:ring-[#1C4633]/20 focus:border-[#1C4633] outline-none transition-all text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={groupForm.description}
                    onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                    placeholder="Describe what your group is about..."
                    rows={4}
                    className="w-full px-4 py-3 border border-[#1C4633]/30 rounded-lg focus:ring-2 focus:ring-[#1C4633]/20 focus:border-[#1C4633] outline-none transition-all text-gray-900 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Group Visibility <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 border-[#1C4633]/30">
                      <input
                        type="radio"
                        name="visibility"
                        value="public"
                        checked={groupForm.isPublic}
                        onChange={() => setGroupForm({ ...groupForm, isPublic: true })}
                        className="mt-1 mr-3 text-[#1C4633] focus:ring-[#1C4633]"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Public Group</div>
                        <div className="text-sm text-gray-500 mt-1">
                          Anyone can find and join this group. All members can invite others.
                        </div>
                      </div>
                    </label>
                    <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 border-[#1C4633]/30">
                      <input
                        type="radio"
                        name="visibility"
                        value="private"
                        checked={!groupForm.isPublic}
                        onChange={() => setGroupForm({ ...groupForm, isPublic: false })}
                        className="mt-1 mr-3 text-[#1C4633] focus:ring-[#1C4633]"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Private Group</div>
                        <div className="text-sm text-gray-500 mt-1">
                          Only you and invited members can see this group. Only you can invite new members.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleCreateGroup}
                    disabled={isCreatingGroup}
                    className="flex-1 px-6 py-3 bg-[#1C4633] text-white rounded-lg hover:bg-[#1C4633]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg font-medium"
                  >
                    {isCreatingGroup ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Creating...
                      </span>
                    ) : (
                      'Create Group'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateGroupModal(false);
                      setGroupForm({
                        name: '',
                        description: '',
                        activityTypeID: 0,
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
    </div>
  );
}

