'use client';

import React from 'react';
import { TravelPlanDto } from '@/lib/api/travelPlans';
import StarRating from './StarRating';
import FavoriteButton from './FavoriteButton';

interface RoutePopupProps {
  travelPlan: TravelPlanDto;
  onClose: () => void;
  onViewDetails?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
}

const difficultyColors: Record<number, string> = {
  1: 'bg-green-500',
  2: 'bg-yellow-500',
  3: 'bg-red-500',
};

const difficultyLabels: Record<number, string> = {
  1: 'Kolay',
  2: 'Orta',
  3: 'Zor',
};

const routeTypeLabels: Record<number, string> = {
  1: 'Gezi',
  2: 'Yürüyüş',
};

const getImageUrl = (imageUrl?: string | null) => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${process.env.NEXT_PUBLIC_API_URL || 'http://13.53.168.27:5000'}${imageUrl}`;
};

export default function RoutePopup({ travelPlan, onClose, onViewDetails, onEdit, onDelete, canEdit }: RoutePopupProps) {
  return (
    <div className="bg-white rounded-lg shadow-xl p-4 min-w-[280px] max-w-[320px]">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-bold text-black">{travelPlan.title}</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-xl leading-none"
        >
          ×
        </button>
      </div>

      <p className="text-sm text-gray-700 mb-3 line-clamp-2">{travelPlan.description}</p>

      <div className="flex flex-wrap gap-2 mb-3">
        <span className={`px-2 py-1 rounded text-xs font-semibold text-white ${
          difficultyColors[travelPlan.difficulty] || 'bg-gray-500'
        }`}>
          {difficultyLabels[travelPlan.difficulty] || 'Bilinmiyor'}
        </span>
        <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-500 text-white">
          {routeTypeLabels[travelPlan.type] || 'Bilinmiyor'}
        </span>
      </div>

      <div className="space-y-2 text-sm mb-3">
        {travelPlan.totalDistanceInMeters && (
          <div className="flex items-center text-gray-700">
            <span className="mr-2">📏</span>
            <span>{(travelPlan.totalDistanceInMeters / 1000).toFixed(1)} km</span>
          </div>
        )}
        <div className="flex items-center text-gray-700">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center overflow-hidden ring-1 ring-white shadow-sm mr-2 ${
            getImageUrl(travelPlan.creatorImageUrl) ? 'bg-white' : 'bg-gradient-to-br from-[#1C4633] to-[#DA922B]'
          }`}>
            {getImageUrl(travelPlan.creatorImageUrl) ? (
              <img src={getImageUrl(travelPlan.creatorImageUrl)!} alt={travelPlan.creatorName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-[8px] font-bold">{travelPlan.creatorName?.[0]?.toUpperCase() || 'U'}</span>
            )}
          </div>
          <span>{travelPlan.creatorName}</span>
        </div>
      </div>

      {/* Star Rating Component */}
      <div className="mb-3 pb-3 border-b border-gray-200">
        <StarRating
          travelPlanId={travelPlan.travelPlanID}
          averageRating={travelPlan.averageRating}
          totalRatings={travelPlan.totalRatings}
          onRatingChange={() => {
            // Rating değiştiğinde parent component'i bilgilendir
            if (onViewDetails) {
              // Detay sayfasına yönlendir veya yenile
            }
          }}
        />
      </div>

      {/* Favorite Button */}
      <div className="mb-3 flex items-center justify-center">
        <FavoriteButton
          travelPlanId={travelPlan.travelPlanID}
          size="md"
        />
      </div>

      <div className="flex gap-2">
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="flex-1 bg-[#1e3a2e] text-white py-2 px-4 rounded-lg hover:bg-[#2d5a3d] transition-colors text-sm font-medium"
          >
            Detaylar
          </button>
        )}
        {canEdit && onEdit && (
          <button
            onClick={onEdit}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            title="Düzenle"
          >
            ✏️
          </button>
        )}
        {canEdit && onDelete && (
          <button
            onClick={onDelete}
            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            title="Sil"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}

