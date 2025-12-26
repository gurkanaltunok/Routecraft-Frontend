'use client';

import React, { useState, useRef, useEffect } from 'react';
import { travelPlansApi, TravelPlanDto } from '@/lib/api/travelPlans';
import { useToast } from '@/contexts/ToastContext';

interface RouteEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  travelPlan: TravelPlanDto;
  onSave: (updatedPlan: TravelPlanDto) => void;
}

export default function RouteEditModal({ isOpen, onClose, travelPlan, onSave }: RouteEditModalProps) {
  const { showToast } = useToast();
  const [title, setTitle] = useState(travelPlan.title);
  const [description, setDescription] = useState(travelPlan.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens with new travel plan
  useEffect(() => {
    if (isOpen) {
      setTitle(travelPlan.title);
      setDescription(travelPlan.description || '');
      setCoverImagePreview(null);
      setCoverImageFile(null);
    }
  }, [isOpen, travelPlan]);

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        showToast('Invalid file type. Please select a JPG, PNG, GIF, or WEBP image.', 'error');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast('File size exceeds 5MB limit.', 'error');
        return;
      }

      setCoverImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showToast('Title is required', 'error');
      return;
    }

    try {
      setIsSaving(true);

      // First update title and description
      const updateRequest = {
        title: title.trim(),
        description: description.trim(),
        type: travelPlan.type,
        difficulty: travelPlan.difficulty,
        totalDistanceInMeters: travelPlan.totalDistanceInMeters,
        totalElevationGainInMeters: travelPlan.totalElevationGainInMeters,
        routePath: travelPlan.routePath,
        stops: travelPlan.stops,
      };

      let updatedPlan = await travelPlansApi.update(travelPlan.travelPlanID, updateRequest);

      // If there's a new cover image, upload it
      if (coverImageFile) {
        setIsUploadingImage(true);
        const result = await travelPlansApi.uploadCoverImage(travelPlan.travelPlanID, coverImageFile);
        updatedPlan = {
          ...updatedPlan,
          coverImageUrl: result.imageUrl,
        };
        setIsUploadingImage(false);
      }

      onSave(updatedPlan);
    } catch (error: any) {
      console.error('Error updating route:', error);
      showToast(error.message || 'Failed to update route', 'error');
    } finally {
      setIsSaving(false);
      setIsUploadingImage(false);
    }
  };

  const handleRemoveCoverImage = () => {
    setCoverImagePreview(null);
    setCoverImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const currentCoverImage = travelPlan.coverImageUrl 
    ? `${process.env.NEXT_PUBLIC_API_URL || 'http://13.53.168.27:5000'}${travelPlan.coverImageUrl}`
    : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-[#1C4633]">Edit Route</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4633] focus:border-transparent outline-none transition-all"
                placeholder="Enter route title"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4633] focus:border-transparent outline-none transition-all resize-none"
                placeholder="Enter route description"
              />
            </div>

            {/* Cover Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cover Image
              </label>
              
              {/* Current or Preview Image */}
              <div className="relative w-full h-40 bg-[#F4F4F2] rounded-lg overflow-hidden mb-3">
                {coverImagePreview ? (
                  <img
                    src={coverImagePreview}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                ) : currentCoverImage ? (
                  <img
                    src={currentCoverImage}
                    alt={travelPlan.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1C4633] to-[#2d5a3d]">
                    <div className="text-center text-white">
                      <svg
                        className="w-12 h-12 mx-auto mb-2 opacity-50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="text-sm">No cover image</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleCoverImageChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 px-4 py-2 bg-[#F4F4F2] text-[#1C4633] rounded-lg hover:bg-[#1C4633]/10 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {coverImagePreview ? 'Change Image' : 'Upload Image'}
                </button>
                {coverImagePreview && (
                  <button
                    type="button"
                    onClick={handleRemoveCoverImage}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Supported formats: JPG, PNG, GIF, WEBP. Max size: 5MB
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
              className="px-5 py-2.5 bg-[#1C4633] text-white rounded-lg hover:bg-[#1C4633]/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>{isUploadingImage ? 'Uploading...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

