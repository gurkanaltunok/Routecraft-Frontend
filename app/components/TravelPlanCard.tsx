'use client';

import { TravelPlanDto } from '@/lib/api/travelPlans';
import Link from 'next/link';

interface TravelPlanCardProps {
  travelPlan: TravelPlanDto;
  showDeleteButton?: boolean;
  onDelete?: (travelPlanId: number) => void;
}

const difficultyLabels: Record<number, string> = {
  1: 'Easy',
  2: 'Medium',
  3: 'Hard',
};

const routeTypeLabels: Record<number, string> = {
  1: 'Trip',
  2: 'Hiking',
};

const difficultyColors: Record<number, string> = {
  1: '#10B981',
  2: '#FCD34D',
  3: '#EF4444',
};

const getImageUrl = (imageUrl?: string | null) => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${process.env.NEXT_PUBLIC_API_URL || 'http://13.53.168.27:5000'}${imageUrl}`;
};

export default function TravelPlanCard({ travelPlan, showDeleteButton = false, onDelete }: TravelPlanCardProps) {
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(travelPlan.travelPlanID);
    }
  };


  return (
    <div className="relative">
      {/* Delete Button - Outside the card */}
      {showDeleteButton && onDelete && (
        <button
          onClick={handleDeleteClick}
          className="absolute -top-3 -right-3 z-50 w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-xl border-2 border-gray-100 hover:bg-red-500 hover:border-red-500 hover:text-white transition-all text-gray-500 group/delete hover:scale-110 hover:shadow-2xl"
          title="Delete route"
        >
          <svg
            className="w-5 h-5 group-hover/delete:scale-110 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      )}
      
      <Link href={`/routes/${travelPlan.travelPlanID}`}>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer group relative transform hover:-translate-y-1">

        {/* Cover Image Section */}
        <div className="relative w-full h-56 bg-gradient-to-br from-[#1C4633] to-[#2D5F47] overflow-hidden">
          {travelPlan.coverImageUrl ? (
            <>
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://13.53.168.27:5000'}${travelPlan.coverImageUrl}`}
                alt={travelPlan.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </>
          ) : (
            <>
              {/* Modern Default Cover Design - Beyazımsı Arka Plan */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#F8F9FA] via-[#F4F4F2] to-[#E9ECEF]">
                {/* Subtle Pattern Overlay */}
                <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1C4633" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
                
                {/* Geometric Shapes - Subtle */}
                <div className="absolute inset-0 overflow-hidden">
                  {/* Large Circle */}
                  <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-[#1C4633]/5 blur-2xl" />
                  <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-[#DA922B]/5 blur-2xl" />
                  
                  {/* Small Accent Circles */}
                  <div className="absolute top-8 right-12 w-3 h-3 rounded-full bg-[#1C4633]/10" />
                  <div className="absolute bottom-12 left-8 w-2 h-2 rounded-full bg-[#DA922B]/10" />
                  <div className="absolute top-1/2 right-8 w-2.5 h-2.5 rounded-full bg-[#1C4633]/8" />
                </div>

                {/* Center Location Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    {/* Icon Background Glow */}
                    <div className="absolute inset-0 bg-[#1C4633]/5 rounded-full blur-xl scale-150" />
                    
                    {/* Location Pin Icon */}
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <svg 
                        className="w-20 h-20 text-[#1C4633]/70 drop-shadow-lg group-hover:scale-110 group-hover:text-[#1C4633] transition-all duration-300" 
                        fill="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        {/* Location Pin */}
                        <path 
                          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Badges Overlay - Top Right */}
          <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
            <span
              className="px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-lg backdrop-blur-sm"
              style={{ 
                backgroundColor: `${difficultyColors[travelPlan.difficulty] || '#6B7280'}CC`,
              }}
            >
              {difficultyLabels[travelPlan.difficulty] || 'Unknown'}
            </span>
            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/90 backdrop-blur-sm text-[#1C4633] shadow-lg">
              {routeTypeLabels[travelPlan.type] || 'Unknown'}
            </span>
          </div>

          {/* Rating Badge - Top Right */}
          {travelPlan.averageRating > 0 && (
            <div className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-sm shadow-lg flex items-center gap-1.5">
              <svg className="w-4 h-4 text-[#DA922B]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-bold text-gray-800">{travelPlan.averageRating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-5">
          <h3 className="font-bold text-xl text-[#1C4633] mb-2 group-hover:text-[#DA922B] transition-colors line-clamp-1">
            {travelPlan.title}
          </h3>
          <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
            {travelPlan.description || 'No description available'}
          </p>

          {/* Stats Section */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            {travelPlan.totalDistanceInMeters && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <div className="w-8 h-8 rounded-full bg-[#1C4633]/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#1C4633]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className="font-semibold">{(travelPlan.totalDistanceInMeters / 1000).toFixed(1)} km</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-white shadow-sm ${
                getImageUrl(travelPlan.creatorImageUrl) ? 'bg-white' : 'bg-gradient-to-br from-[#1C4633] to-[#DA922B]'
              }`}>
                {getImageUrl(travelPlan.creatorImageUrl) ? (
                  <img 
                    src={getImageUrl(travelPlan.creatorImageUrl)!} 
                    alt={travelPlan.creatorName} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <span className="text-white text-xs font-bold">
                    {travelPlan.creatorName?.[0]?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <span className="font-medium text-gray-600 truncate max-w-[120px]">{travelPlan.creatorName}</span>
            </div>
          </div>
        </div>
      </div>
      </Link>
    </div>
  );
}

