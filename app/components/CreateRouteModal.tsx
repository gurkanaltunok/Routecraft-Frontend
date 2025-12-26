'use client';

import React, { useState, useEffect } from 'react';
import { CreateTravelPlanRequest, CoordinateDto } from '@/lib/api/travelPlans';

interface CreateRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTravelPlanRequest) => Promise<void>;
  routePath: CoordinateDto[] | null;
  distance: number | null;
  duration: number | null;
  initialData?: CreateTravelPlanRequest & { id?: number };
  isEditMode?: boolean;
}

export default function CreateRouteModal({
  isOpen,
  onClose,
  onSubmit,
  routePath,
  distance,
  duration,
  initialData,
  isEditMode = false,
}: CreateRouteModalProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    type: initialData?.type || 1, // Trip
    difficulty: initialData?.difficulty || 1, // Easy
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        type: initialData.type || 1,
        difficulty: initialData.difficulty || 1,
      });
    }
  }, [initialData]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Title is required.');
      return;
    }

    if (!routePath || routePath.length < 2) {
      setError('Route path is required. Please draw a route on the map.');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        ...formData,
        totalDistanceInMeters: distance,
        routePath,
      });
      // Formu sıfırla
      setFormData({
        title: '',
        description: '',
        type: 1,
        difficulty: 1,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the route.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    if (minutes > 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-black">
              {isEditMode ? 'Edit Route' : 'Create New Route'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {distance && duration && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-gray-700">
                <strong>Distance:</strong> {(distance / 1000).toFixed(1)} km
              </div>
              <div className="text-sm text-gray-700">
                <strong>Duration:</strong> {formatDuration(duration)}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a2e] focus:border-transparent outline-none text-black"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a2e] focus:border-transparent outline-none text-black"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Route Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a2e] focus:border-transparent outline-none text-black"
              >
                <option value={1}>Trip</option>
                <option value={2}>Hiking</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty Level
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a2e] focus:border-transparent outline-none text-black"
              >
                <option value={1}>Easy</option>
                <option value={2}>Medium</option>
                <option value={3}>Hard</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-[#1e3a2e] text-white rounded-lg hover:bg-[#2d5a3d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (isEditMode ? 'Updating...' : 'Saving...') : (isEditMode ? 'Update' : 'Save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

