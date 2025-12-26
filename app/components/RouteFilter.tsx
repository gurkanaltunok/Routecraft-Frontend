'use client';

import { useState } from 'react';

export interface FilterState {
  minRating: number;
  minDistance: number | null;
  maxDistance: number | null;
  difficulty: number | null; // 1 = Easy, 2 = Medium, 3 = Hard
}

interface RouteFilterProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onReset: () => void;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export default function RouteFilter({ filters, onFiltersChange, onReset, isExpanded: externalIsExpanded, onToggle }: RouteFilterProps) {
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;
  
  const toggleExpanded = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalIsExpanded(!internalIsExpanded);
    }
  };

  const handleChange = (key: keyof FilterState, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const hasActiveFilters = 
    filters.minRating > 0 ||
    filters.minDistance !== null ||
    filters.maxDistance !== null ||
    filters.difficulty !== null;

  return (
    <div className="bg-white rounded-lg border border-[#1C4633]/20 mb-6 overflow-hidden">
      {/* Filter Header - Fully Clickable */}
      <button
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer"
        aria-label={isExpanded ? 'Collapse filters' : 'Expand filters'}
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-[#1C4633]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h3 className="text-lg font-semibold text-[#1C4633]">Filters</h3>
          {hasActiveFilters && (
            <span className="px-2 py-1 text-xs font-medium bg-[#DA922B] text-white rounded-full">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              className="px-3 py-1 text-sm text-gray-600 hover:text-[#1C4633] transition-colors"
            >
              Reset
            </button>
          )}
          <svg
            className={`w-5 h-5 text-[#1C4633] transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Filter Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap items-end gap-5">
            {/* Difficulty Filter - Modern Button Group */}
            <div className="flex-1 min-w-[220px]">
              <label className="block text-sm font-semibold text-[#1C4633] mb-2">
                Difficulty
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: null, label: 'All', color: 'gray' },
                  { value: 1, label: 'Easy', color: '#10B981' },
                  { value: 2, label: 'Medium', color: '#FCD34D' },
                  { value: 3, label: 'Hard', color: '#EF4444' },
                ].map((option) => {
                  const isSelected = filters.difficulty === option.value;
                  return (
                    <button
                      key={option.value === null ? 'all' : option.value}
                      type="button"
                      onClick={() => handleChange('difficulty', option.value)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                        isSelected
                          ? option.value === null
                            ? 'bg-[#1C4633] text-white shadow-md'
                            : 'text-white shadow-md'
                          : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-[#1C4633]/30 hover:bg-[#1C4633]/5'
                      }`}
                      style={
                        isSelected && option.value !== null
                          ? { backgroundColor: option.color }
                          : {}
                      }
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rating Filter - Star Selection */}
            <div className="flex-1 min-w-[220px]">
              <label className="block text-sm font-semibold text-[#1C4633] mb-2">
                Min Rating
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white border-2 border-[#1C4633]/30 rounded-lg p-1.5">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => handleChange('minRating', rating === filters.minRating ? 0 : rating)}
                      className="focus:outline-none transition-transform hover:scale-110"
                      aria-label={`${rating} star${rating > 1 ? 's' : ''}`}
                    >
                      <svg
                        className={`w-7 h-7 ${
                          rating <= filters.minRating
                            ? 'text-yellow-400'
                            : 'text-gray-300'
                        } transition-colors`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
                {filters.minRating > 0 && (
                  <button
                    type="button"
                    onClick={() => handleChange('minRating', 0)}
                    className="text-sm text-gray-500 hover:text-[#1C4633] transition-colors px-2 py-1"
                    aria-label="Clear rating filter"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Distance Filter */}
            <div className="flex-1 min-w-[220px]">
              <label className="block text-sm font-semibold text-[#1C4633] mb-2">
                Distance (km)
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="number"
                    value={filters.minDistance || ''}
                    onChange={(e) => handleChange('minDistance', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Min"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2.5 border-2 border-[#1C4633]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C4633]/20 focus:border-[#1C4633] text-gray-900 placeholder-gray-400 transition-all hover:border-[#1C4633]/50 text-base"
                  />
                </div>
                <span className="text-gray-500 font-medium text-sm">to</span>
                <div className="flex-1 relative">
                  <input
                    type="number"
                    value={filters.maxDistance || ''}
                    onChange={(e) => handleChange('maxDistance', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Max"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2.5 border-2 border-[#1C4633]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C4633]/20 focus:border-[#1C4633] text-gray-900 placeholder-gray-400 transition-all hover:border-[#1C4633]/50 text-base"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

