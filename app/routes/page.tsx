'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import Header from '@/app/components/Header';
import Sidebar from '@/app/components/Sidebar';
import TravelPlanCard from '@/app/components/TravelPlanCard';
import RouteFilter, { FilterState } from '@/app/components/RouteFilter';
import DeleteConfirmationModal from '@/app/components/DeleteConfirmationModal';
import { travelPlansApi, TravelPlanDto } from '@/lib/api/travelPlans';

export default function MyRoutesPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [travelPlans, setTravelPlans] = useState<TravelPlanDto[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<TravelPlanDto[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    minRating: 0,
    minDistance: null,
    maxDistance: null,
    difficulty: null,
  });
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<{ id: number; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Auth kontrolü
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Load user's routes
  useEffect(() => {
    if (isAuthenticated && user?.userId) {
      loadMyRoutes();
    }
  }, [isAuthenticated, user]);

  // Apply filters and search
  useEffect(() => {
    let filtered = [...travelPlans];

    // Apply search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (plan) =>
          plan.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          plan.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply rating filter
    if (filters.minRating > 0) {
      filtered = filtered.filter((plan) => plan.averageRating >= filters.minRating);
    }

    // Apply distance filter
    if (filters.minDistance !== null || filters.maxDistance !== null) {
      filtered = filtered.filter((plan) => {
        if (!plan.totalDistanceInMeters) return false;
        const distanceKm = plan.totalDistanceInMeters / 1000;
        if (filters.minDistance !== null && distanceKm < filters.minDistance) return false;
        if (filters.maxDistance !== null && distanceKm > filters.maxDistance) return false;
        return true;
      });
    }

    // Apply difficulty filter
    if (filters.difficulty !== null) {
      filtered = filtered.filter((plan) => plan.difficulty === filters.difficulty);
    }

    setFilteredPlans(filtered);
  }, [searchQuery, travelPlans, filters]);

  const loadMyRoutes = async () => {
    if (!user?.userId) return;
    
    try {
      setIsLoadingPlans(true);
      const allPlans = await travelPlansApi.getAll();
      // Filter for current user's routes
      const myPlans = allPlans.filter(plan => plan.creatorId === user.userId);
      setTravelPlans(myPlans);
      setFilteredPlans(myPlans);
    } catch (error) {
      console.error('Error loading my routes:', error);
      setTravelPlans([]);
      setFilteredPlans([]);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({
      minRating: 0,
      minDistance: null,
      maxDistance: null,
      difficulty: null,
    });
  };

  const handleDeleteClick = (travelPlanId: number) => {
    const plan = travelPlans.find(p => p.travelPlanID === travelPlanId);
    if (plan) {
      setRouteToDelete({ id: travelPlanId, title: plan.title });
      setDeleteModalOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!routeToDelete || isDeleting) {
      console.log('handleConfirmDelete: early return', { routeToDelete, isDeleting });
      return;
    }

    console.log('handleConfirmDelete: starting delete for route', routeToDelete.id);
    try {
      setIsDeleting(true);
      console.log('handleConfirmDelete: calling API delete');
      await travelPlansApi.delete(routeToDelete.id);
      console.log('handleConfirmDelete: API delete successful');
      
      // Remove from state
      setTravelPlans(prev => prev.filter(p => p.travelPlanID !== routeToDelete.id));
      setFilteredPlans(prev => prev.filter(p => p.travelPlanID !== routeToDelete.id));
      
      showToast('Route deleted successfully', 'success');
      setRouteToDelete(null);
      setDeleteModalOpen(false);
      console.log('handleConfirmDelete: state updated and modal closed');
    } catch (error: any) {
      console.error('Error deleting route:', error);
      showToast(error.message || 'Failed to delete route', 'error');
      setDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Loading state
  if (authLoading || isLoadingPlans) {
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
                  <h1 className="text-3xl font-bold text-[#1C4633] mb-2">My Routes</h1>
                  <p className="text-gray-600">
                    Manage and view all your created routes
                  </p>
                </div>
                
                {/* Unified Toolbar: Search, Filter */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  {/* Search Bar - Takes available space */}
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search your routes..."
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

                  {/* Filter Button - Matches search bar height */}
                  <button
                    onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                    className={`flex items-center justify-center gap-2 h-12 px-6 rounded-lg transition-colors font-medium shadow-sm ${
                      isFilterExpanded
                        ? 'bg-[#1C4633] text-white hover:bg-[#1C4633]/90'
                        : 'bg-white border border-[#1C4633]/30 text-[#1C4633] hover:bg-[#F4F4F2]'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span className="text-base">Filters</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Component */}
            {isFilterExpanded && (
              <RouteFilter
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onReset={handleResetFilters}
                isExpanded={isFilterExpanded}
                onToggle={() => setIsFilterExpanded(!isFilterExpanded)}
              />
            )}

            {/* Search Results Count */}
            {filteredPlans.length > 0 && travelPlans.length > 0 && (
              <div className="mb-4 text-sm text-gray-600 flex items-center gap-2">
                <span className="font-medium">Showing {filteredPlans.length}</span>
                <span>of</span>
                <span className="font-medium">{travelPlans.length}</span>
                <span>routes</span>
              </div>
            )}

            {/* Routes Grid */}
            {filteredPlans.length === 0 ? (
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
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  {travelPlans.length === 0 ? "No routes yet" : "No routes found"}
                </h3>
                <p className="text-gray-500 mb-6">
                  {travelPlans.length === 0
                    ? "You haven't created any routes yet. Start by creating your first route!"
                    : 'No routes match your current filters. Try adjusting your search or filters.'}
                </p>
                {travelPlans.length === 0 && (
                  <div className="flex gap-3 justify-center">
                    <Link
                      href="/routes/create"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#DA922B] text-white rounded-lg hover:bg-[#DA922B]/90 transition-colors font-medium shadow-sm"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Create Trip Route</span>
                    </Link>
                    <Link
                      href="/routes/create-hiking"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#1C4633] text-white rounded-lg hover:bg-[#1C4633]/90 transition-colors font-medium shadow-sm"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Create Hiking Route</span>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredPlans.map((plan) => (
                  <TravelPlanCard
                    key={plan.travelPlanID}
                    travelPlan={plan}
                    showDeleteButton={true}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setRouteToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Route"
        message="Are you sure you want to delete this route? This action cannot be undone."
        itemName={routeToDelete?.title}
      />
    </div>
  );
}

