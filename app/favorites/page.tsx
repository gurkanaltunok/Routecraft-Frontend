'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/app/components/Header';
import Sidebar from '@/app/components/Sidebar';
import TravelPlanCard from '@/app/components/TravelPlanCard';
import RouteFilter, { FilterState } from '@/app/components/RouteFilter';
import { travelPlansApi, TravelPlanDto } from '@/lib/api/travelPlans';
import { favoritesApi, UserFavoriteTripDto } from '@/lib/api/favorites';

export default function FavoritesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [favorites, setFavorites] = useState<UserFavoriteTripDto[]>([]);
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

  // Auth kontrolü
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Favorites yükle
  useEffect(() => {
    if (isAuthenticated) {
      loadFavorites();
    }
  }, [isAuthenticated]);

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

  const loadFavorites = async () => {
    try {
      setIsLoadingPlans(true);
      // Get user favorites
      const userFavorites = await favoritesApi.getUserFavorites();
      setFavorites(userFavorites);

      // Get all travel plans and filter for favorites
      const allPlans = await travelPlansApi.getAll();
      const favoritePlanIds = new Set(userFavorites.map(f => f.travelPlanID));
      const favoritePlans = allPlans.filter(plan => favoritePlanIds.has(plan.travelPlanID));
      
      setTravelPlans(favoritePlans);
      setFilteredPlans(favoritePlans);
    } catch (error) {
      console.error('Error loading favorites:', error);
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
          <div className="p-4 md:p-6">
            {/* Page Header / Toolbar */}
            <div className="bg-white rounded-lg border border-[#1C4633]/20 p-4 md:p-6 mb-6 shadow-sm">
              <div className="flex flex-col gap-6">
                {/* Page Title */}
                <h1 className="text-3xl font-bold text-[#1C4633]">Favorite Routes</h1>
                
                {/* Unified Toolbar: Search, Filter */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  {/* Search Bar - Takes available space */}
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search favorite routes..."
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

            {/* Loading State */}
            {isLoadingPlans ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1C4633] mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading favorite routes...</p>
                </div>
              </div>
            ) : filteredPlans.length === 0 ? (
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
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  No favorite routes yet
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery ? 'No search results found.' : 'Start exploring routes and add them to your favorites!'}
                </p>
              </div>
            ) : (
              /* Favorite Routes Cards Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredPlans.map((plan) => (
                  <TravelPlanCard key={plan.travelPlanID} travelPlan={plan} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

