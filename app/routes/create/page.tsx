'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Map, Marker, Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Header from '@/app/components/Header';
import Sidebar from '@/app/components/Sidebar';
import WeatherWidget from '@/app/components/WeatherWidget';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { travelPlansApi, CoordinateDto, StopDto, CreateTravelPlanRequest } from '@/lib/api/travelPlans';

interface Stop {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category?: string;
  placeId?: string;
}

interface RouteInfo {
  distance: number;
  duration: number;
}

const difficultyColors: { [key: number]: string } = {
  1: '#10B981', // Easy - Green
  2: '#FCD34D', // Medium - Yellow
  3: '#EF4444', // Hard - Red
};

const routeTypeOptions = [
  { value: 1, label: 'Trip' },
  { value: 2, label: 'Hiking' },
];

const difficultyOptions = [
  { value: 1, label: 'Easy' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'Hard' },
];

// Sortable Stop Item Component
interface SortableStopItemProps {
  stop: Stop;
  index: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: (stopId: string) => void;
  onMoveDown: (stopId: string) => void;
  onRemove: (stopId: string) => void;
}

function SortableStopItem({
  stop,
  index,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRemove,
}: SortableStopItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 bg-[#F4F4F2] rounded-xl border border-[#1C4633]/10 hover:border-[#1C4633]/20 transition-all ${
        isDragging ? 'shadow-lg border-[#1C4633]/30' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-2 hover:bg-white/50 active:bg-white rounded-lg transition-all flex items-center justify-center flex-shrink-0"
            title="Drag to reorder"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-gray-400"
            >
              <circle cx="4" cy="4" r="1.5" fill="currentColor" />
              <circle cx="12" cy="4" r="1.5" fill="currentColor" />
              <circle cx="4" cy="8" r="1.5" fill="currentColor" />
              <circle cx="12" cy="8" r="1.5" fill="currentColor" />
              <circle cx="4" cy="12" r="1.5" fill="currentColor" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            </svg>
          </div>
          
          <div className="w-10 h-10 bg-[#DA922B] rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-md">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-[#1C4633] text-sm">{stop.name}</h4>
            <p className="text-xs text-gray-500 mt-0.5">{stop.address}</p>
            {stop.category && (
              <div className="text-xs text-gray-500 mt-1.5 px-2 py-0.5 bg-gray-100 rounded-md inline-block capitalize">
                {stop.category}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onMoveUp(stop.id)}
            disabled={!canMoveUp}
            className="p-2 bg-white border border-[#1C4633]/20 rounded-lg hover:bg-[#1C4633]/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Move up"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[#1C4633]"
            >
              <path
                d="M6 3L3 6H9L6 3Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <button
            onClick={() => onMoveDown(stop.id)}
            disabled={!canMoveDown}
            className="p-2 bg-white border border-[#1C4633]/20 rounded-lg hover:bg-[#1C4633]/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Move down"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[#1C4633]"
            >
              <path
                d="M6 9L3 6H9L6 9Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <button
            onClick={() => onRemove(stop.id)}
            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            title="Remove stop"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 4L4 12M4 4L12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateRoutePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const mapRef = useRef<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [locationRequested, setLocationRequested] = useState(false);

  // DnD Kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Get route type from URL
  const typeParam = searchParams.get('type');
  const defaultType = typeParam ? parseInt(typeParam) : 1;

  // Mapbox token from environment
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

  // Map state
  const [viewState, setViewState] = useState({
    longitude: 33.3823, // Default to KKTC
    latitude: 35.1856,
    zoom: 10,
  });

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Stops state
  const [stops, setStops] = useState<Stop[]>([]);
  const [currentRouteGeoJSON, setCurrentRouteGeoJSON] = useState<any>(null);
  const [currentRouteInfo, setCurrentRouteInfo] = useState<RouteInfo | null>(null);

  // User location state
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Zoom controls
  const handleZoomIn = () => {
    setViewState((prev) => ({
      ...prev,
      zoom: Math.min(prev.zoom + 1, 22),
      transitionDuration: 300,
    }));
  };

  const handleZoomOut = () => {
    setViewState((prev) => ({
      ...prev,
      zoom: Math.max(prev.zoom - 1, 0),
      transitionDuration: 300,
    }));
  };

  const handleCenterMap = () => {
    if (userLocation) {
      setViewState((prev) => ({
        ...prev,
        longitude: userLocation.longitude,
        latitude: userLocation.latitude,
        zoom: 14,
        transitionDuration: 300,
      }));
    } else if (stops.length > 0) {
      // Center on stops
      const avgLat = stops.reduce((sum, stop) => sum + stop.latitude, 0) / stops.length;
      const avgLng = stops.reduce((sum, stop) => sum + stop.longitude, 0) / stops.length;
      setViewState((prev) => ({
        ...prev,
        longitude: avgLng,
        latitude: avgLat,
        zoom: 13,
        transitionDuration: 300,
      }));
    }
  };
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: defaultType,
    difficulty: 1,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);

  // Client-side mount check
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auth check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Get user location on component mount
  useEffect(() => {
    if (!isMounted || locationRequested) return;

    if ('geolocation' in navigator) {
      setLocationRequested(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });
          setViewState((prev) => ({
            ...prev,
            longitude,
            latitude,
            zoom: 12,
            transitionDuration: 300,
          }));
        },
        (error) => {
          console.warn('Error getting user location:', error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    }
  }, [isMounted, locationRequested]);

  // Helper function to calculate distance between two coordinates (Haversine formula)
  const getDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }, []);

  // Handle search input change with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    const timer = setTimeout(async () => {
      setIsSearching(true);
      setError('');
      
      try {
        const params = new URLSearchParams({
          query: searchQuery,
        });
        
        if (userLocation) {
          params.append('latitude', userLocation.latitude.toString());
          params.append('longitude', userLocation.longitude.toString());
          params.append('radius', '50000');
        }
        
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://routecraft.duckdns.org';
        const url = `${backendUrl}/api/config/search-places?${params.toString()}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'REQUEST_DENIED' || data.status === 'ZERO_RESULTS') {
          setError(data.error_message || 'No results found');
          setSearchResults([]);
          return;
        }
        
        if (data.error_message) {
          setError(data.error_message);
          setSearchResults([]);
          return;
        }
        
        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
          const transformedResults = data.results.map((place: any) => ({
            place_id: place.place_id,
            id: place.place_id,
            text: place.name,
            place_name: place.formatted_address || place.name,
            center: [place.geometry.location.lng, place.geometry.location.lat],
            properties: {
              category: place.types?.[0] || 'establishment',
              rating: place.rating,
              user_ratings_total: place.user_ratings_total,
            },
            googlePlace: {
              name: place.name,
              address: place.formatted_address,
              rating: place.rating,
              types: place.types || [],
              placeId: place.place_id,
            }
          }));
          
          let sortedResults = transformedResults;
          if (userLocation) {
            sortedResults = transformedResults.sort((a: any, b: any) => {
              const distanceA = getDistance(
                userLocation.latitude,
                userLocation.longitude,
                a.center[1],
                a.center[0]
              );
              const distanceB = getDistance(
                userLocation.latitude,
                userLocation.longitude,
                b.center[1],
                b.center[0]
              );
              return distanceA - distanceB;
            });
          }
          
          setSearchResults(sortedResults.slice(0, 10));
          setError('');
        } else {
          setSearchResults([]);
          setError('No results found');
        }
      } catch (error: any) {
        console.error('Search error:', error);
        setError(error?.message || 'An error occurred while searching. Please try again.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, userLocation, getDistance]);

  // Add place as stop
  const addPlaceAsStop = useCallback((feature: any) => {
    const placeName = feature.text || feature.googlePlace?.name || feature.place_name || 'Unknown Place';
    const address = feature.googlePlace?.address || feature.place_name || '';
    const coordinates = feature.center || [0, 0];
    
    let category = 'Location';
    if (feature.googlePlace?.types && feature.googlePlace.types.length > 0) {
      const relevantTypes = feature.googlePlace.types.filter((t: string) => 
        !['establishment', 'point_of_interest', 'location'].includes(t)
      );
      category = relevantTypes[0] || feature.googlePlace.types[0] || 'Location';
      category = category.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    }
    
    const newStop: Stop = {
      id: feature.place_id || feature.id || Date.now().toString(),
      name: placeName,
      address: address,
      latitude: coordinates[1],
      longitude: coordinates[0],
      category: category,
      placeId: feature.place_id || feature.googlePlace?.placeId || undefined,
    };

    setStops((prev) => [...prev, newStop]);
    setSearchQuery('');
    setSearchResults([]);
    setError('');
  }, []);

  // Calculate route when stops change
  useEffect(() => {
    if (stops.length >= 2 && mapboxToken) {
      calculateRoute();
    } else {
      setCurrentRouteGeoJSON(null);
      setCurrentRouteInfo(null);
    }
  }, [stops, mapboxToken]);

  // Calculate route from stops using Mapbox Directions API
  const calculateRoute = async () => {
    if (!mapboxToken || stops.length < 2) return;

    const coordinates = stops.map((stop) => `${stop.longitude},${stop.latitude}`).join(';');
    const profile = 'driving';
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?steps=true&geometries=geojson&access_token=${mapboxToken}`;

    try {
      const response = await fetch(url);
      const json = await response.json();

      if (json.routes && json.routes.length > 0) {
        const data = json.routes[0];
        const routeLine = {
          type: 'Feature',
          properties: {},
          geometry: data.geometry,
        };
        setCurrentRouteGeoJSON(routeLine);
        setCurrentRouteInfo({
          distance: data.distance,
          duration: data.duration,
        });
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      setError('Failed to calculate route. Please try again.');
    }
  };

  // Remove stop
  const removeStop = (stopId: string) => {
    setStops((prev) => prev.filter((stop) => stop.id !== stopId));
  };

  // Move stop up/down in order
  const moveStop = (stopId: string, direction: 'up' | 'down') => {
    setStops((prev) => {
      const index = prev.findIndex((s) => s.id === stopId);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;

      const newStops = [...prev];
      [newStops[index], newStops[newIndex]] = [newStops[newIndex], newStops[index]];
      return newStops;
    });
  };

  // Handle drag end for reordering stops
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setStops((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Clear all stops
  const clearStops = () => {
    setStops([]);
    setCurrentRouteGeoJSON(null);
    setCurrentRouteInfo(null);
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Title is required.');
      return;
    }

    if (stops.length < 2) {
      setError('Please add at least 2 stops to create a route.');
      return;
    }

    if (!currentRouteGeoJSON) {
      setError('Failed to calculate route. Please try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      const coordinates: CoordinateDto[] = currentRouteGeoJSON.geometry.coordinates.map(
        (coord: [number, number]) => ({
          longitude: coord[0],
          latitude: coord[1],
        })
      );

      // Convert stops to StopDto format
      const stopsDto: StopDto[] = stops.map((stop) => ({
        id: stop.id,
        name: stop.name,
        address: stop.address,
        latitude: stop.latitude,
        longitude: stop.longitude,
        category: stop.category || null,
        placeId: stop.placeId || null,
      }));

      const request: CreateTravelPlanRequest = {
        ...formData,
        totalDistanceInMeters: currentRouteInfo?.distance || null,
        routePath: coordinates,
        stops: stopsDto,
      };

      const createdPlan = await travelPlansApi.create(request);

      // Upload cover image if provided
      if (coverImage && createdPlan.travelPlanID) {
        try {
          console.log('Uploading cover image for route:', createdPlan.travelPlanID);
          const uploadResult = await travelPlansApi.uploadCoverImage(createdPlan.travelPlanID, coverImage);
          console.log('Cover image uploaded successfully:', uploadResult);
        } catch (imageError: any) {
          console.error('Error uploading cover image:', imageError);
          console.error('Image error details:', {
            message: imageError.message,
            status: imageError.status,
            response: imageError.response
          });
          // Show error toast but don't block route creation
          showToast('Route created successfully, but cover image upload failed. You can upload it later.', 'warning');
        }
      }

      router.push('/routes');
    } catch (err: any) {
      console.error('=== ERROR CREATING TRAVEL PLAN ===');
      console.error('Error object:', err);
      console.error('Error message:', err.message);
      console.error('Error status:', err.status);
      console.error('Error response:', err.response);
      console.error('Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
      
      let errorMessage = 'An error occurred while saving the route.';
      
      // Try to get detailed error from response
      if (err.response?.data) {
        console.error('Response data found:', err.response.data);
        
        if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error;
        } else if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        }
        
        // Add details if available
        if (err.response.data.details) {
          const details = typeof err.response.data.details === 'string' 
            ? err.response.data.details 
            : JSON.stringify(err.response.data.details);
          errorMessage += `\n\nDetay: ${details.substring(0, 200)}`;
        } else if (err.response.data.innerException) {
          errorMessage += `\n\nInternal Error: ${err.response.data.innerException}`;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // Network errors
      if (err.message && err.message.includes('Failed to connect')) {
        errorMessage = 'Backend sunucusuna bağlanılamadı. Lütfen backend\'in çalıştığından emin olun.';
      }
      
      // HTTP status specific messages
      if (err.status === 401) {
        errorMessage = 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.';
      } else if (err.status === 403) {
        errorMessage = 'Bu işlem için yetkiniz yok.';
      } else if (err.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      }
      
      console.error('Final error message to display:', errorMessage);
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !isMounted) {
    return (
      <div className="min-h-screen bg-[#F4F4F2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1C4633] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!mapboxToken) {
    return (
      <div className="min-h-screen bg-[#F4F4F2] flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md border border-[#1C4633]/20">
          <h2 className="text-red-600 text-xl font-bold mb-4">Mapbox Token Required</h2>
          <p className="text-gray-700 mb-4">Mapbox token is required to display the map.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F2] flex flex-col">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 lg:ml-64 transition-all duration-300 flex flex-col">
          {/* Top Form Bar */}
          <div className="bg-white border-b border-[#1C4633]/10 p-6 shadow-sm">
            <div className="w-full">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                  {/* Title */}
                  <div className="w-full md:w-auto md:min-w-[300px] md:max-w-[400px]">
                    <label className="block text-sm font-semibold text-[#1C4633] mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3 bg-[#F4F4F2] border border-[#1C4633]/20 rounded-xl focus:ring-2 focus:ring-[#1C4633]/30 focus:border-[#1C4633] outline-none text-gray-900 transition-all placeholder:text-gray-400"
                      placeholder="Enter trip title"
                      required
                    />
                  </div>

                  {/* Difficulty and Save Button */}
                  <div className="flex items-end gap-3 md:ml-auto">
                    {/* Difficulty */}
                    <div>
                      <label className="block text-sm font-semibold text-[#1C4633] mb-2">
                        Difficulty
                      </label>
                      <div className="flex gap-2">
                        {difficultyOptions.map((option) => {
                          const isSelected = formData.difficulty === option.value;
                          const bgColor = difficultyColors[option.value];
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, difficulty: option.value })}
                              className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                                isSelected
                                  ? 'shadow-lg scale-105 border-2 border-gray-500'
                                  : 'hover:scale-105 border-2 border-transparent opacity-60 hover:opacity-80'
                              }`}
                              style={{
                                backgroundColor: bgColor,
                                color: 'white',
                              }}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting || stops.length < 2}
                      className="px-6 py-2.5 bg-[#DA922B] text-white rounded-xl hover:bg-[#DA922B]/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md hover:shadow-lg disabled:hover:shadow-md whitespace-nowrap"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Trip'}
                    </button>
                  </div>
                </div>

                {/* Route Info Display */}
                {currentRouteInfo && (
                  <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-[#1C4633]/10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#1C4633]"></div>
                      <span className="text-sm text-gray-600">Distance:</span>
                      <span className="text-sm font-semibold text-[#1C4633]">
                        {(currentRouteInfo.distance / 1000).toFixed(2)} km
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#DA922B]"></div>
                      <span className="text-sm text-gray-600">Duration:</span>
                      <span className="text-sm font-semibold text-[#1C4633]">
                        {Math.floor(currentRouteInfo.duration / 60)} min
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#1C4633]"></div>
                      <span className="text-sm text-gray-600">Stops:</span>
                      <span className="text-sm font-semibold text-[#1C4633]">{stops.length}</span>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Map and Stops Panel */}
          <div className="flex flex-1 overflow-hidden">
            {/* Map Area */}
            <div className="flex-1 relative">
              {/* Weather Widget */}
              <WeatherWidget 
                latitude={viewState.latitude} 
                longitude={viewState.longitude} 
                className="absolute top-4 left-4 z-10"
              />
              <Map
                ref={mapRef}
                {...viewState}
                onMove={(evt: any) => setViewState(evt.viewState)}
                mapboxAccessToken={mapboxToken}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/streets-v12"
              >
                {/* User Location Marker */}
                {userLocation && (
                  <Marker longitude={userLocation.longitude} latitude={userLocation.latitude}>
                    <div className="relative">
                      <div className="w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-blue-600"></div>
                      <div className="absolute top-0 left-0 w-6 h-6 bg-blue-600 rounded-full animate-ping opacity-75"></div>
                    </div>
                  </Marker>
                )}

                {/* Stop Markers */}
                {stops.map((stop, index) => (
                  <Marker key={stop.id} longitude={stop.longitude} latitude={stop.latitude}>
                    <div className="relative">
                      <div className="w-8 h-8 bg-[#DA922B] rounded-full border-2 border-white shadow-lg flex items-center justify-center font-bold text-white text-sm">
                        {index + 1}
                      </div>
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#DA922B]"></div>
                    </div>
                  </Marker>
                ))}

                {/* Route Line */}
                {currentRouteGeoJSON && (
                  <Source id="route" type="geojson" data={currentRouteGeoJSON}>
                    <Layer
                      id="route-line"
                      type="line"
                      paint={{
                        'line-color': difficultyColors[formData.difficulty] || '#1C4633',
                        'line-width': 4,
                        'line-opacity': 0.8,
                      }}
                    />
                  </Source>
                )}
              </Map>

              {/* Vertical Zoom Slider - Right Center */}
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10">
                <div className="bg-white/60 backdrop-blur-md border border-white/20 rounded-lg shadow-lg relative flex items-center justify-center" style={{ height: '150px', width: '24px', padding: '0' }}>
                  {/* Vertical Slider */}
                  <input
                    type="range"
                    min="0"
                    max="22"
                    step="0.1"
                    value={viewState.zoom}
                    onChange={(e) => {
                      setViewState((prev) => ({
                        ...prev,
                        zoom: parseFloat(e.target.value),
                        transitionDuration: 0,
                      }));
                    }}
                    className="zoom-slider-vertical appearance-none cursor-pointer"
                    title={`Zoom: ${viewState.zoom.toFixed(1)}`}
                  />
                </div>
              </div>

              {/* Zoom Controls - Right Side */}
              <div className="absolute top-4 right-4 z-10">
                <div className="bg-white/70 backdrop-blur-md border border-white/20 rounded-lg shadow-lg p-1 flex flex-col gap-1">
                  <button
                    onClick={handleZoomIn}
                    className="w-[36px] h-[36px] rounded flex items-center justify-center hover:bg-white/60 transition-colors"
                    title="Zoom In"
                  >
                    <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                  <button
                    onClick={handleZoomOut}
                    className="w-[36px] h-[36px] rounded flex items-center justify-center hover:bg-white/60 transition-colors"
                    title="Zoom Out"
                  >
                    <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                    </svg>
                  </button>
                  <button
                    onClick={handleCenterMap}
                    className="w-[36px] h-[36px] rounded flex items-center justify-center hover:bg-white/60 transition-colors"
                    title="Center Map"
                  >
                    <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Search Box */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-xl px-4">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for cafes, restaurants, historic places..."
                    className="w-full pl-12 pr-12 py-3.5 bg-white/95 backdrop-blur-md border border-[#1C4633]/20 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-[#1C4633]/30 focus:border-[#1C4633] text-gray-900 placeholder-gray-400 transition-all"
                  />
                  {isSearching && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#1C4633] border-t-transparent"></div>
                    </div>
                  )}
                  
                  {/* Search Results Dropdown */}
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-[#1C4633]/10 max-h-96 overflow-y-auto z-50">
                      {searchResults.map((feature, index) => {
                        const placeName = feature.text || feature.googlePlace?.name || feature.place_name || 'Unknown Place';
                        const address = feature.googlePlace?.address || feature.place_name || '';
                        const rating = feature.googlePlace?.rating || feature.properties?.rating;
                        const category = feature.properties?.category || (feature.googlePlace?.types?.[0] ? feature.googlePlace.types[0].replace(/_/g, ' ') : '');
                        
                        return (
                          <button
                            key={feature.place_id || feature.id || index}
                            type="button"
                            onClick={() => addPlaceAsStop(feature)}
                            className="w-full px-5 py-4 text-left hover:bg-[#F4F4F2] transition-colors border-b border-gray-100 last:border-b-0 first:rounded-t-xl last:rounded-b-xl"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-[#1C4633]">{placeName}</div>
                                {address && <div className="text-sm text-gray-600 mt-1">{address}</div>}
                                {category && (
                                  <div className="text-xs text-gray-500 mt-1.5 px-2 py-0.5 bg-gray-100 rounded-md inline-block capitalize">
                                    {category}
                                  </div>
                                )}
                              </div>
                              {rating && (
                                <div className="flex items-center ml-3 text-sm text-[#DA922B] font-semibold">
                                  <span>★</span>
                                  <span className="ml-1">{rating.toFixed(1)}</span>
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel - Description and Stops List */}
            <div className="w-[500px] bg-white border-l border-[#1C4633]/10 flex flex-col">
              {/* Description Section */}
              <div className="p-6 border-b border-[#1C4633]/10">
                <h3 className="text-xl font-bold text-[#1C4633] mb-4">Description</h3>
                <textarea
                  ref={descriptionTextareaRef}
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    // Auto-resize textarea
                    if (descriptionTextareaRef.current) {
                      descriptionTextareaRef.current.style.height = 'auto';
                      descriptionTextareaRef.current.style.height = `${Math.max(100, descriptionTextareaRef.current.scrollHeight)}px`;
                    }
                  }}
                  className="w-full px-4 py-3 bg-[#F4F4F2] border border-[#1C4633]/20 rounded-xl focus:ring-2 focus:ring-[#1C4633]/30 focus:border-[#1C4633] outline-none text-gray-900 transition-all placeholder:text-gray-400 resize-none"
                  placeholder="Describe your trip..."
                  rows={4}
                  style={{
                    minHeight: '100px',
                    height: '100px',
                  }}
                />
              </div>

              {/* Cover Image Upload */}
              <div className="bg-white rounded-xl p-6 border border-[#1C4633]/20">
                <label className="block text-sm font-semibold text-[#1C4633] mb-3">
                  Cover Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCoverImage(file);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setCoverImagePreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                  id="cover-image-upload"
                />
                <label
                  htmlFor="cover-image-upload"
                  className="cursor-pointer block"
                >
                  <div className="relative w-full h-64 rounded-xl border-2 border-dashed border-[#1C4633]/30 hover:border-[#1C4633]/50 transition-colors bg-[#F4F4F2] overflow-hidden group">
                    {coverImagePreview ? (
                      <>
                        <img
                          src={coverImagePreview}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg">
                            <span className="text-sm font-medium text-[#1C4633]">Change Image</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCoverImage(null);
                            setCoverImagePreview(null);
                            const input = document.getElementById('cover-image-upload') as HTMLInputElement;
                            if (input) input.value = '';
                          }}
                          className="absolute top-3 right-3 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg z-10"
                          title="Remove image"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-[#1C4633]/60 group-hover:text-[#1C4633] transition-colors">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div className="text-center">
                          <p className="text-sm font-medium mb-1">Click to upload cover image</p>
                          <p className="text-xs text-gray-500">JPG, PNG, GIF or WEBP (max 5MB)</p>
                        </div>
                      </div>
                    )}
                  </div>
                </label>
                <p className="text-xs text-gray-500 mt-3">
                  If not provided, a map preview will be used as the cover image.
                </p>
              </div>

              {/* Stops List */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-[#1C4633]">Trip Stops</h3>
                  {stops.length > 0 && (
                    <button
                      onClick={clearStops}
                      className="text-sm text-red-600 hover:text-red-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {stops.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F4F4F2] flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="font-medium mb-1">No stops added yet</p>
                    <p className="text-sm text-gray-400">Search for places using the search box above</p>
                  </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={stops.map((stop) => stop.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {stops.map((stop, index) => (
                        <SortableStopItem
                          key={stop.id}
                          stop={stop}
                          index={index}
                          canMoveUp={index > 0}
                          canMoveDown={index < stops.length - 1}
                          onMoveUp={(stopId) => moveStop(stopId, 'up')}
                          onMoveDown={(stopId) => moveStop(stopId, 'down')}
                          onRemove={removeStop}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function CreateRoutePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F4F4F2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1C4633] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CreateRoutePageContent />
    </Suspense>
  );
}
