'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { travelPlansApi, TravelPlanDto } from '@/lib/api/travelPlans';

const difficultyColors: { [key: number]: string } = {
  1: '#10B981', // Easy - Green
  2: '#FCD34D', // Medium - Yellow
  3: '#EF4444', // Hard - Red
};

const difficultyLabels: { [key: number]: string } = {
  1: 'Easy',
  2: 'Medium',
  3: 'Hard',
};

const getImageUrl = (imageUrl?: string | null) => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${process.env.NEXT_PUBLIC_API_URL || 'http://13.53.168.27:5000'}${imageUrl}`;
};

export default function FeaturedRoutes() {
  const [routes, setRoutes] = useState<TravelPlanDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFeaturedRoutes();
  }, []);

  const loadFeaturedRoutes = async () => {
    try {
      setIsLoading(true);
      const allRoutes = await travelPlansApi.getAll();
      // Sort by rating and take top 4
      const sorted = [...allRoutes]
        .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
        .slice(0, 4);
      setRoutes(sorted);
    } catch (error) {
      console.error('Error loading featured routes:', error);
      // Use mock data if API fails
      setRoutes([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="py-20 bg-[#F4F4F2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-[#1C4633] mb-4">
            Featured Routes
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover the most popular travel plans and hiking trails
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1C4633]"></div>
          </div>
        ) : routes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-6">No routes available yet. Be the first to create one!</p>
            <Link
              href="/register"
              className="inline-block px-6 py-3 bg-[#DA922B] text-white rounded-lg hover:bg-[#DA922B]/90 transition-colors font-medium"
            >
              Sign Up to Create Routes
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {routes.map((route) => (
                <Link
                  key={route.travelPlanID}
                  href={`/routes/${route.travelPlanID}`}
                  className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
                >
                  {/* Placeholder Image */}
                  <div
                    className="h-48 bg-gradient-to-br from-[#1C4633] to-[#DA922B] relative"
                  >
                    {route.routePath && route.routePath.length > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg
                          className="w-24 h-24 text-white/20"
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
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-bold text-[#1C4633] line-clamp-2">
                        {route.title}
                      </h3>
                      {route.averageRating && (
                        <div className="flex items-center text-[#DA922B] ml-2 flex-shrink-0">
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="ml-1 text-sm font-semibold">
                            {route.averageRating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>

                    {route.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {route.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-1 text-xs font-semibold text-white rounded"
                          style={{
                            backgroundColor: difficultyColors[route.difficulty] || '#6B7280',
                          }}
                        >
                          {difficultyLabels[route.difficulty] || 'Unknown'}
                        </span>
                        {route.totalDistanceInMeters && (
                          <span className="text-xs text-gray-500">
                            {(route.totalDistanceInMeters / 1000).toFixed(1)} km
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center overflow-hidden ring-1 ring-white shadow-sm ${
                          getImageUrl(route.creatorImageUrl) ? 'bg-white' : 'bg-gradient-to-br from-[#1C4633] to-[#DA922B]'
                        }`}>
                          {getImageUrl(route.creatorImageUrl) ? (
                            <img 
                              src={getImageUrl(route.creatorImageUrl)!} 
                              alt={route.creatorName} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <span className="text-white text-[8px] font-bold">
                              {route.creatorName?.[0]?.toUpperCase() || 'U'}
                            </span>
                          )}
                        </div>
                        <span>by <span className="font-medium text-[#1C4633]">{route.creatorName}</span></span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center">
              <Link
                href="/discover"
                className="inline-block px-8 py-3 bg-[#1C4633] text-white rounded-lg hover:bg-[#1C4633]/90 transition-colors font-medium text-lg"
              >
                See All Routes
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

