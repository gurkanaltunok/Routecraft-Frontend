'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import CitySlider from './components/CitySlider';
import TravelPlanCard from './components/TravelPlanCard';
import { travelPlansApi, TravelPlanDto } from '@/lib/api/travelPlans';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [trendingRoutes, setTrendingRoutes] = useState<TravelPlanDto[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);

  const handleSearch = (query: string) => {
    // Search functionality can be added later if needed
  };

  const handleCTAClick = () => {
    if (isAuthenticated) {
      router.push('/trips');
    } else {
      router.push('/register');
    }
  };

  // Fetch trending hiking routes
  useEffect(() => {
    const loadTrendingRoutes = async () => {
      try {
        setIsLoadingTrending(true);
        // Fetch hiking routes (RouteType.Hike = 2)
        const allHikingRoutes = await travelPlansApi.getByType(2);
        
        // Shuffle array using Fisher-Yates algorithm
        const shuffled = [...allHikingRoutes];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        // Select first 4 routes
        const selected = shuffled.slice(0, 4);
        setTrendingRoutes(selected);
      } catch (error) {
        console.error('Error loading trending routes:', error);
        setTrendingRoutes([]);
      } finally {
        setIsLoadingTrending(false);
      }
    };

    loadTrendingRoutes();
  }, []);

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

          {/* Vertical Stack Landing Page Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6 pb-12 lg:pb-16">
            {/* Hero Section - Slider at Top */}
            <div className="mb-12">
              <CitySlider />
            </div>

            {/* Hero Text Section - Centered */}
            <div className="text-center mb-16">
              <h1 className="text-5xl md:text-6xl font-bold text-[#1C4633] mb-4 leading-tight">
                RouteCraft
              </h1>
              <p className="text-2xl font-bold tracking-widest text-[#DA922B] mb-6 uppercase">
                PLAN. DISCOVER. SHARE.
              </p>
              <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto mb-8">
                Discover hidden trails, plan detailed city trips, and share your adventures with a global community. Start exploring today.
              </p>
              <button
                onClick={handleCTAClick}
                className="px-8 py-4 bg-[#DA922B] text-white text-lg font-semibold rounded-lg hover:bg-[#DA922B]/90 transition-all transform hover:scale-105 shadow-lg"
              >
                Start Exploring Now
              </button>
            </div>

            {/* Why Choose RouteCraft Section */}
            <div className="mb-20">
              <div className="mb-8">
                <h2 className="text-3xl md:text-4xl font-bold text-[#1C4633] mb-8">
                  Why Choose RouteCraft?
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Feature 1 - Smart Planning */}
                <div className="bg-gray-50 rounded-xl p-6 md:p-8">
                  <div className="mb-4">
                    <svg
                      className="w-12 h-12 text-[#DA922B]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-[#1C4633] mb-3">
                    Smart Planning
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Create detailed routes with stops, distances, and difficulty levels.
                  </p>
                </div>

                {/* Feature 2 - Global Community */}
                <div className="bg-gray-50 rounded-xl p-6 md:p-8">
                  <div className="mb-4">
                    <svg
                      className="w-12 h-12 text-[#DA922B]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-[#1C4633] mb-3">
                    Global Community
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Access thousands of trips created by locals and travelers worldwide.
                  </p>
                </div>

                {/* Feature 3 - Seamless Navigation */}
                <div className="bg-gray-50 rounded-xl p-6 md:p-8">
                  <div className="mb-4">
                    <svg
                      className="w-12 h-12 text-[#DA922B]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-[#1C4633] mb-3">
                    Seamless Navigation
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Follow your routes in real-time with our integrated map system.
                  </p>
                </div>

                {/* Feature 4 - Share Your Adventures */}
                <div className="bg-gray-50 rounded-xl p-6 md:p-8">
                  <div className="mb-4">
                    <svg
                      className="w-12 h-12 text-[#DA922B]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-[#1C4633] mb-3">
                    Share Your Adventures
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Inspire others by publishing your routes and build your reputation in the community.
                  </p>
                </div>
              </div>
            </div>

            {/* Trending Routes Section */}
            <div className="mb-12">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-[#1C4633] mb-3">
                  Trending Routes
                </h2>
                <p className="text-lg text-gray-600">
                  Top rated adventures by our community.
                </p>
              </div>
              {isLoadingTrending ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1C4633] mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading trending routes...</p>
                  </div>
                </div>
              ) : trendingRoutes.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">No trending routes available at the moment.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {trendingRoutes.map((route) => (
                    <TravelPlanCard key={route.travelPlanID} travelPlan={route} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
