'use client';

import React, { useState, useEffect } from 'react';
import { ratingsApi, TravelPlanRatingDto } from '@/lib/api/ratings';
import { useAuth } from '@/contexts/AuthContext';

interface StarRatingProps {
  travelPlanId: number;
  averageRating?: number;
  totalRatings?: number;
  onRatingChange?: () => void;
}

export default function StarRating({ 
  travelPlanId, 
  averageRating = 0, 
  totalRatings = 0,
  onRatingChange 
}: StarRatingProps) {
  const { isAuthenticated } = useAuth();
  const [userRating, setUserRating] = useState<TravelPlanRatingDto | null>(null);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayRating, setDisplayRating] = useState(averageRating);
  const [displayTotalRatings, setDisplayTotalRatings] = useState(totalRatings);

  // Load user's rating - try to load even if isAuthenticated might be false (token might exist in localStorage)
  useEffect(() => {
    loadUserRating();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [travelPlanId]);

  // Update display when props change (these come from parent after rating change)
  useEffect(() => {
    if (averageRating !== undefined) {
      setDisplayRating(averageRating);
    }
    if (totalRatings !== undefined) {
      setDisplayTotalRatings(totalRatings);
    }
  }, [averageRating, totalRatings]);

  const loadUserRating = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rating = await ratingsApi.getUserRatingForTravelPlan(travelPlanId);
      setUserRating(rating);
    } catch (err: any) {
      // 404 is normal (user hasn't rated yet), don't show error
      if (err.status === 404 || err.message?.includes('404') || err.message?.includes('Not Found')) {
        setUserRating(null);
        setIsLoading(false);
        return;
      }
      // Network errors (backend not running)
      if (err.message?.includes('Failed to connect') || err.message?.includes('fetch')) {
        console.error('Backend connection error:', err);
        setError(null); // Don't show error for connection issues, just log
        setUserRating(null);
        setIsLoading(false);
        return;
      }
      console.error('Error loading user rating:', err);
      setError(null); // Don't show error, just log
      setUserRating(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStarClick = async (stars: number) => {
    // Prevent duplicate clicks while submitting
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (userRating) {
        // Update existing rating
        const updated = await ratingsApi.updateRating(userRating.ratingID, { stars });
        setUserRating(updated);
      } else {
        try {
          // Create new rating
          const newRating = await ratingsApi.createRating({ travelPlanID: travelPlanId, stars });
          setUserRating(newRating);
        } catch (createErr: any) {
          // Handle duplicate key error (race condition when clicking fast)
          // If duplicate rating error, it means user has already rated but we didn't load it
          // Try to load the existing rating and update it instead
          if (createErr.message?.includes('duplicate') || 
              createErr.message?.includes('already exists') ||
              createErr.message?.includes('already rated')) {
            try {
              const existingRating = await ratingsApi.getUserRatingForTravelPlan(travelPlanId);
              if (existingRating) {
                // Found existing rating, update it instead
                setUserRating(existingRating);
                const updated = await ratingsApi.updateRating(existingRating.ratingID, { stars });
                setUserRating(updated);
              } else {
                // Couldn't find existing rating, show error
                throw createErr;
              }
            } catch (reloadErr: any) {
              // Failed to reload, show original error
              throw createErr;
            }
          } else {
            // Different error, re-throw
            throw createErr;
          }
        }
      }
      
      // Reload to get updated average from backend (this will update AverageRating and TotalRatings)
      if (onRatingChange) {
        onRatingChange();
      }
    } catch (err: any) {
      console.error('Error submitting rating:', err);
      if (err.message?.includes('Failed to connect')) {
        setError('Failed to connect to server. Please make sure the backend is running.');
      } else if (err.status === 401 || err.message?.includes('Unauthorized')) {
        // 401 means token is missing or invalid - this shouldn't happen if isAuthenticated is true
        // But handle it gracefully by suggesting login
        console.error('401 Unauthorized error in rating:', err);
        setError('You must be logged in to rate this trip. Please try logging out and logging in again.');
      } else if (err.message?.includes('already rated') || err.message?.includes('already exists')) {
        // This shouldn't happen if the above catch worked, but handle it anyway
        setError('You have already rated this trip. Please refresh the page.');
      } else {
        setError(err.message || 'An error occurred while submitting your rating.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRating = async () => {
    if (!userRating) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await ratingsApi.deleteRating(userRating.ratingID);
      setUserRating(null);

      // Reload to get updated average from backend (this will update AverageRating and TotalRatings)
      if (onRatingChange) {
        onRatingChange();
      }
    } catch (err: any) {
      console.error('Error deleting rating:', err);
      setError(err.message || 'An error occurred while deleting your rating.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStarColor = (starIndex: number) => {
    // Show hover state, or user's rating, or average rating if no user rating
    const ratingToShow = hoveredStar !== null ? hoveredStar : (userRating?.stars || (displayRating > 0 ? Math.round(displayRating) : 0));
    return starIndex <= ratingToShow ? 'text-yellow-400' : 'text-gray-300';
  };

  const getStarFill = (starIndex: number) => {
    const ratingToShow = hoveredStar !== null ? hoveredStar : (userRating?.stars || (displayRating > 0 ? Math.round(displayRating) : 0));
    return starIndex <= ratingToShow;
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => !isSubmitting && setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(null)}
              disabled={isSubmitting}
              className={`${getStarColor(star)} transition-colors ${
                !isSubmitting ? 'hover:scale-110 cursor-pointer' : 'cursor-not-allowed opacity-50'
              }`}
              title={`${star} star${star !== 1 ? 's' : ''}`}
            >
              <svg
                className="w-5 h-5"
                fill={getStarFill(star) ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-gray-700">
            {displayRating > 0 ? displayRating.toFixed(1) : '0.0'}
          </span>
          {displayTotalRatings > 0 && (
            <span className="text-gray-500">
              ({displayTotalRatings} {displayTotalRatings === 1 ? 'rating' : 'ratings'})
            </span>
          )}
        </div>
      </div>

      {userRating && (
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span>Your rating: {userRating.stars} star{userRating.stars !== 1 ? 's' : ''}</span>
          <button
            onClick={handleDeleteRating}
            disabled={isSubmitting}
            className="text-red-600 hover:text-red-800 underline disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      )}

      {error && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {isSubmitting && (
        <div className="text-xs text-gray-500">
          Processing...
        </div>
      )}
    </div>
  );
}

