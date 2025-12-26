'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/app/components/Header';
import Sidebar from '@/app/components/Sidebar';
import TravelPlanCard from '@/app/components/TravelPlanCard';
import RouteFilter, { FilterState } from '@/app/components/RouteFilter';
import { travelPlansApi, TravelPlanDto } from '@/lib/api/travelPlans';

export default function HikingPage() {
  const { isAuthenticated, isLoading } = useAuth();
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

  // Auth kontrolü
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Hiking routes yükle (RouteType.Hike = 2)
  useEffect(() => {
    if (isAuthenticated) {
      loadHiking();
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

  const loadHiking = async () => {
    try {
      setIsLoadingPlans(true);
      const plans = await travelPlansApi.getByType(2); // RouteType.Hike = 2
      setTravelPlans(plans);
      setFilteredPlans(plans);
    } catch (error) {
      console.error('Error loading hiking routes:', error);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCreateNew = () => {
    router.push('/routes/create-hiking'); // Hiking route creation page
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
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F4F2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1C4633] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Auth kontrolü geçtiyse sayfayı göster
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F4F4F2] flex flex-col">
      <Header onSearch={handleSearch} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content */}
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
                <h1 className="text-3xl font-bold text-[#1C4633]">Explore Hiking Routes</h1>
                
                {/* Unified Toolbar: Search, Filter, Create */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  {/* Search Bar - Takes available space */}
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search hiking routes..."
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

                  {/* Create New Hiking Button - Most prominent */}
                  <button
                    onClick={handleCreateNew}
                    className="flex items-center justify-center gap-2 h-12 px-6 bg-[#DA922B] text-white rounded-lg hover:bg-[#DA922B]/90 transition-colors font-medium text-lg shadow-sm"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Create New Hiking</span>
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
                  <p className="text-gray-600">Loading hiking routes...</p>
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
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  No hiking routes yet
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery ? 'No search results found.' : 'Create your first hiking route!'}
                </p>
                <button
                  onClick={handleCreateNew}
                  className="inline-block px-6 py-3 bg-[#DA922B] text-white rounded-lg hover:bg-[#DA922B]/90 transition-colors font-medium"
                >
                  Create New Hiking Route
                </button>
              </div>
            ) : (
              /* Hiking Cards Grid */
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


