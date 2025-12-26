'use client';

import React, { useState, useEffect } from 'react';
import { favoritesApi } from '@/lib/api/favorites';
import { useAuth } from '@/contexts/AuthContext';

interface FavoriteButtonProps {
  travelPlanId: number;
  onFavoriteChange?: () => void;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function FavoriteButton({ 
  travelPlanId, 
  onFavoriteChange,
  showCount = false,
  size = 'md'
}: FavoriteButtonProps) {
  const { isAuthenticated } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favoriteCount, setFavoriteCount] = useState(0);

  // Check if token exists
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('auth_token');

  // Load favorite status
  useEffect(() => {
    if (isAuthenticated) {
      loadFavoriteStatus();
    } else {
      setIsFavorite(false);
    }
  }, [travelPlanId, isAuthenticated]);

  const loadFavoriteStatus = async () => {
    if (!isAuthenticated) {
      setIsFavorite(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const favorite = await favoritesApi.isFavorite(travelPlanId);
      setIsFavorite(favorite);
    } catch (err: any) {
      // Don't show error for unauthorized or 404, just set to false silently
      if (err.status === 401 || err.status === 404 || 
          err.message?.includes('401') || err.message?.includes('Unauthorized') ||
          err.message?.includes('404') || err.message?.includes('Not Found')) {
        setIsFavorite(false);
        setError(null);
        return;
      }
      console.error('Error loading favorite status:', err);
      setIsFavorite(false);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check both isAuthenticated and token
    if (!isAuthenticated || !hasToken) {
      setError('Please log in to add favorites');
      setTimeout(() => {
        setError(null);
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }, 2000);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isFavorite) {
        // Remove from favorites
        await favoritesApi.removeFavorite(travelPlanId);
        setIsFavorite(false);
        setFavoriteCount(prev => Math.max(0, prev - 1));
      } else {
        // Add to favorites
        await favoritesApi.addFavorite({ travelPlanID: travelPlanId });
        setIsFavorite(true);
        setFavoriteCount(prev => prev + 1);
      }
      
      // Reload favorite status to ensure consistency
      await loadFavoriteStatus();

      if (onFavoriteChange) {
        onFavoriteChange();
      }
    } catch (err: any) {
      console.error('Error toggling favorite:', err);
      
      // Handle 401 Unauthorized specifically
      if (err.status === 401 || err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        // Check if token exists
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (!token) {
          setError('Please log in to add favorites');
          setTimeout(() => {
            setError(null);
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
          }, 2000);
        } else {
          // Token exists but was rejected - might be expired
          setError('Session expired. Please log in again.');
          setTimeout(() => {
            setError(null);
            // Clear token and redirect to login
            if (typeof window !== 'undefined') {
              localStorage.removeItem('auth_token');
              window.location.href = '/login';
            }
          }, 2000);
        }
      } else {
        const errorMessage = err.message || err.response?.data?.message || 'An error occurred while updating favorite';
        setError(errorMessage);
        setTimeout(() => setError(null), 3000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const iconSize = sizeClasses[size];

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={handleToggleFavorite}
        disabled={!isAuthenticated || !hasToken || isSubmitting || isLoading}
        className={`${iconSize} transition-all duration-200 ${
          isAuthenticated && hasToken && !isSubmitting && !isLoading
            ? 'hover:scale-110 cursor-pointer active:scale-95'
            : 'cursor-not-allowed opacity-50'
        }`}
        title={
          !isAuthenticated || !hasToken
            ? 'Please log in to add favorites'
            : isFavorite
            ? 'Remove from favorites'
            : 'Add to favorites'
        }
      >
        {isSubmitting ? (
          <svg
            className={`${iconSize} text-gray-400 animate-spin`}
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            className={`${iconSize} ${isFavorite ? 'text-red-500' : 'text-gray-400'}`}
            fill={isFavorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        )}
      </button>

      {showCount && favoriteCount > 0 && (
        <span className="text-xs text-gray-600">{favoriteCount}</span>
      )}

      {error && (
        <div className="text-xs text-red-600 bg-red-50 p-1 rounded max-w-xs text-center mt-1">
          {error}
        </div>
      )}
    </div>
  );
}

