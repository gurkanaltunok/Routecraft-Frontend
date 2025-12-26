'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Map, Marker, Popup, Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface PlaceDetails {
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  rating?: number;
  user_ratings_total?: number;
  website?: string;
  url?: string;
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  photos?: { photo_reference: string }[];
  types?: string[];
  price_level?: number;
}
import { travelPlansApi, TravelPlanDto, CoordinateDto } from '@/lib/api/travelPlans';
import Header from '@/app/components/Header';
import Sidebar from '@/app/components/Sidebar';
import StarRating from '@/app/components/StarRating';
import FavoriteButton from '@/app/components/FavoriteButton';
import CommentBox from '@/app/components/CommentBox';
import DeleteConfirmationModal from '@/app/components/DeleteConfirmationModal';
import RouteEditModal from '@/app/components/RouteEditModal';
import WeatherWidget from '@/app/components/WeatherWidget';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

const difficultyColors: { [key: number]: string } = {
  1: '#10B981', // Easy - Green
  2: '#FCD34D', // Medium - Yellow
  3: '#EF4444', // Hard - Red
};

const difficultyLabels: Record<number, string> = {
  1: 'Easy',
  2: 'Medium',
  3: 'Hard',
};

const routeTypeLabels: Record<number, string> = {
  1: 'Trip',
  2: 'Hiking',
};

const getImageUrl = (imageUrl?: string | null) => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${process.env.NEXT_PUBLIC_API_URL || 'http://13.53.168.27:5000'}${imageUrl}`;
};

function RouteDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, user, isLoading: authLoading, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [travelPlan, setTravelPlan] = useState<TravelPlanDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedWaypoint, setSelectedWaypoint] = useState<{
    longitude: number;
    latitude: number;
    name: string | null;
    address: string | null;
    category: string | null;
    placeId: string | null;
    index: number;
  } | null>(null);
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [isLoadingPlaceDetails, setIsLoadingPlaceDetails] = useState(false);
  const mapRef = useRef<any>(null);

  const routeId = parseInt(params.id as string);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

  const handleDelete = async () => {
    if (!travelPlan || isDeleting) {
      console.log('handleDelete: early return', { travelPlan: !!travelPlan, isDeleting });
      return;
    }

    console.log('handleDelete: starting delete for route', travelPlan.travelPlanID);
    try {
      setIsDeleting(true);
      console.log('handleDelete: calling API delete');
      await travelPlansApi.delete(travelPlan.travelPlanID);
      console.log('handleDelete: API delete successful');
      showToast('Route deleted successfully', 'success');
      setDeleteModalOpen(false);
      console.log('handleDelete: redirecting to /routes');
      router.push('/routes');
    } catch (error: any) {
      console.error('Error deleting route:', error);
      showToast(error.message || 'Failed to delete route', 'error');
      setDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSave = (updatedPlan: TravelPlanDto) => {
    setTravelPlan(updatedPlan);
    setEditModalOpen(false);
    showToast('Route updated successfully', 'success');
  };

  // Map state
  const [viewState, setViewState] = useState({
    longitude: 33.3823,
    latitude: 35.1856,
    zoom: 10,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (routeId && isMounted) {
      loadRoute();
    }
  }, [routeId, isMounted]);

  // Center map on all stops when loaded
  useEffect(() => {
    if (travelPlan) {
      const stops = travelPlan.stops || [];
      // If there are stops, fit map to show all stops
      if (stops.length > 0) {
        const lngs = stops.map(s => s.longitude);
        const lats = stops.map(s => s.latitude);
        
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        
        const centerLng = (minLng + maxLng) / 2;
        const centerLat = (minLat + maxLat) / 2;
        
        // Calculate zoom level to fit all stops with padding
        const lngDiff = maxLng - minLng;
        const latDiff = maxLat - minLat;
        const maxDiff = Math.max(lngDiff, latDiff);
        
        // Adjust zoom based on the spread of stops
        let zoom = 14;
        if (maxDiff > 0.1) zoom = 10;
        else if (maxDiff > 0.05) zoom = 11;
        else if (maxDiff > 0.02) zoom = 12;
        else if (maxDiff > 0.01) zoom = 13;
        else if (maxDiff > 0.005) zoom = 14;
        else if (maxDiff > 0.001) zoom = 15;
        else zoom = 16;
        
        // Set view state to center on all stops
        setViewState({
          longitude: centerLng,
          latitude: centerLat,
          zoom: zoom,
        });
        
        // Use fitBounds if map is available (for better fitting)
        if (mapRef.current) {
          const map = mapRef.current.getMap ? mapRef.current.getMap() : mapRef.current;
          if (map && map.fitBounds) {
            map.fitBounds(
              [[minLng, minLat], [maxLng, maxLat]],
              {
                padding: { top: 50, bottom: 50, left: 50, right: 50 },
                duration: 0,
              }
            );
          }
        }
      } else if (travelPlan.routePath && travelPlan.routePath.length > 0) {
        // Fallback to route center if no stops
        const coordinates = travelPlan.routePath;
        const lngs = coordinates.map(c => c.longitude);
        const lats = coordinates.map(c => c.latitude);
        
        const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
        const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
        
        setViewState({
          longitude: centerLng,
          latitude: centerLat,
          zoom: 12,
        });
      }
    }
  }, [travelPlan]);

  const loadRoute = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const plan = await travelPlansApi.getById(routeId);
      setTravelPlan(plan);
    } catch (err: any) {
      console.error('Error loading route:', err);
      setError('Failed to load route. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRatingChange = () => {
    loadRoute();
  };

  // Convert routePath to GeoJSON for map display
  const routeGeoJSON = travelPlan?.routePath && travelPlan.routePath.length > 0
    ? {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString' as const,
          coordinates: travelPlan.routePath.map(c => [c.longitude, c.latitude]),
        },
      }
    : null;

  // Use stops if available, otherwise extract waypoints from routePath
  const stops = travelPlan?.stops || [];
  const waypoints = stops.length > 0
    ? stops.map(stop => ({
        longitude: stop.longitude,
        latitude: stop.latitude,
        name: stop.name,
        address: stop.address,
        category: stop.category,
        placeId: stop.placeId || null,
      }))
    : travelPlan?.routePath
    ? travelPlan.routePath.filter((_, index) => {
        // Show first, last, and every 10th point as waypoints
        return index === 0 || index === travelPlan.routePath!.length - 1 || index % 10 === 0;
      }).map(coord => ({
        longitude: coord.longitude,
        latitude: coord.latitude,
        name: null as string | null,
        address: null as string | null,
        category: null as string | null,
        placeId: null as string | null,
      }))
    : [];

  // Fetch place details from Google Places API
  const fetchPlaceDetails = async (placeId: string) => {
    setIsLoadingPlaceDetails(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://13.53.168.27:5000';
      const response = await fetch(`${backendUrl}/api/config/place-details?placeId=${encodeURIComponent(placeId)}`);
      if (!response.ok) throw new Error('Failed to fetch place details');
      const data = await response.json();
      if (data.result) {
        setPlaceDetails(data.result);
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
      setPlaceDetails(null);
    } finally {
      setIsLoadingPlaceDetails(false);
    }
  };

  // Handle waypoint click
  const handleWaypointClick = (waypoint: typeof waypoints[0], index: number) => {
    setSelectedWaypoint({ ...waypoint, index });
    setPlaceDetails(null);
    
    // If waypoint has placeId, fetch details from Google
    if (waypoint.placeId) {
      fetchPlaceDetails(waypoint.placeId);
    }

    // Center map on selected waypoint - offset south (down) so popup fits above
    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom();
      // Zoom in a bit more for better view, but not too much
      const targetZoom = Math.max(currentZoom, 14);
      
      mapRef.current.flyTo({
        center: [waypoint.longitude, waypoint.latitude - 0.008], // Offset south (down) so popup has room above
        zoom: Math.min(targetZoom, 15),
        duration: 800,
      });
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F4F2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1C4633] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading route...</p>
        </div>
      </div>
    );
  }

  if (error || !travelPlan) {
    return (
      <div className="min-h-screen bg-[#F4F4F2] flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md border border-[#1C4633]/20">
          <h2 className="text-red-600 text-xl font-bold mb-4">Route Not Found</h2>
          <p className="text-gray-700 mb-6">{error || 'The route you are looking for does not exist.'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-[#DA922B] text-white rounded-lg hover:bg-[#DA922B]/90 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
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

  const isOwner = user?.userId === travelPlan.creatorId;
  const canEdit = isAuthenticated && (isOwner || isAdmin);
  const canDelete = isAuthenticated && (isOwner || isAdmin);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F9FA] to-[#E9ECEF] flex flex-col">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 lg:ml-64 transition-all duration-300 overflow-y-auto">
          {/* Header Section */}
          <div className="bg-white border-b border-gray-200 shadow-sm">
            <div className="px-3 lg:px-4 py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <button
                      onClick={() => router.back()}
                      className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full transition-all duration-200 text-gray-600"
                      aria-label="Go back"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">{travelPlan.title}</h1>
                      <p className="text-gray-500 mt-0.5">{travelPlan.description || 'No description available'}</p>
                    </div>
                  </div>
                  
                  {/* Route Stats Pills */}
                  <div className="flex flex-wrap items-center gap-2 mt-4 ml-14">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      {routeTypeLabels[travelPlan.type] || 'Unknown'}
                    </span>
                    <span 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                      style={{ backgroundColor: difficultyColors[travelPlan.difficulty] || '#6B7280' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {difficultyLabels[travelPlan.difficulty] || 'Unknown'}
                    </span>
                    {travelPlan.totalDistanceInMeters && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {(travelPlan.totalDistanceInMeters / 1000).toFixed(2)} km
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {waypoints.length} stops
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1C4633]/10 text-[#1C4633] rounded-full text-sm font-medium">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center overflow-hidden ring-1 ring-white shadow-sm ${
                        getImageUrl(travelPlan.creatorImageUrl) ? 'bg-white' : 'bg-gradient-to-br from-[#1C4633] to-[#DA922B]'
                      }`}>
                        {getImageUrl(travelPlan.creatorImageUrl) ? (
                          <img 
                            src={getImageUrl(travelPlan.creatorImageUrl)!} 
                            alt={travelPlan.creatorName} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <span className="text-white text-[10px] font-bold">
                            {travelPlan.creatorName?.[0]?.toUpperCase() || 'U'}
                          </span>
                        )}
                      </div>
                      {travelPlan.creatorName}
                    </span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {canDelete && (
                    <button
                      onClick={() => setDeleteModalOpen(true)}
                      className="w-10 h-10 flex items-center justify-center bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all duration-200 text-red-600"
                      title={isAdmin && !isOwner ? "Delete route (Admin)" : "Delete route"}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => setEditModalOpen(true)}
                      className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-all duration-200 text-gray-600"
                      title={isAdmin && !isOwner ? "Edit route (Admin)" : "Edit route"}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                  {isAdmin && !isOwner && (
                    <span className="px-2 py-1 bg-[#DA922B]/10 text-[#DA922B] text-xs font-medium rounded-lg flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Admin
                    </span>
                  )}
                  <FavoriteButton travelPlanId={travelPlan.travelPlanID} size="lg" />
                </div>
              </div>
            </div>
          </div>

          {/* Map and Sidebar Section */}
          <div className="px-3 lg:px-4 py-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Map Section - Left Side (2 columns) */}
              <div className="lg:col-span-2">
                <div className="h-[700px] relative rounded-2xl overflow-hidden shadow-lg border border-gray-200/60 map-container-rounded" style={{ borderRadius: '1rem' }}>
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
              style={{ width: '100%', height: '100%', borderRadius: '1rem' }}
              mapStyle="mapbox://styles/mapbox/outdoors-v12"
            >
              {/* Route Line */}
              {routeGeoJSON && (
                <Source id="route" type="geojson" data={routeGeoJSON}>
                  <Layer
                    id="route-line-shadow"
                    type="line"
                    paint={{
                      'line-color': '#000',
                      'line-width': 8,
                      'line-opacity': 0.15,
                      'line-blur': 3,
                    }}
                  />
                  <Layer
                    id="route-line"
                    type="line"
                    paint={{
                      'line-color': difficultyColors[travelPlan.difficulty] || '#1C4633',
                      'line-width': 5,
                      'line-opacity': 0.9,
                    }}
                  />
                </Source>
              )}

              {/* Stop/Waypoint Markers */}
              {waypoints.map((waypoint, index) => {
                const isStart = index === 0;
                const isEnd = index === waypoints.length - 1;
                const isSelected = selectedWaypoint?.index === index;
                
                return (
                  <Marker key={index} longitude={waypoint.longitude} latitude={waypoint.latitude}>
                    <div 
                      className="relative group cursor-pointer"
                      onClick={() => handleWaypointClick(waypoint, index)}
                    >
                      {isStart ? (
                        <div className={`w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full border-3 border-white shadow-xl flex items-center justify-center transform hover:scale-110 transition-transform ${isSelected ? 'ring-4 ring-green-300 ring-opacity-50' : ''}`}>
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                          </svg>
                        </div>
                      ) : isEnd ? (
                        <div className={`w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full border-3 border-white shadow-xl flex items-center justify-center transform hover:scale-110 transition-transform ${isSelected ? 'ring-4 ring-red-300 ring-opacity-50' : ''}`}>
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                          </svg>
                        </div>
                      ) : (
                        <div className={`w-9 h-9 bg-gradient-to-br from-[#DA922B] to-[#c77f1f] rounded-full border-2 border-white shadow-lg flex items-center justify-center transform hover:scale-110 transition-transform ${isSelected ? 'ring-4 ring-yellow-300 ring-opacity-50' : ''}`}>
                          <span className="text-white text-sm font-bold">{index + 1}</span>
                        </div>
                      )}
                      {/* Tooltip */}
                      {waypoint.name && !isSelected && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          {waypoint.name}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900/90"></div>
                        </div>
                      )}
                    </div>
                  </Marker>
                );
              })}

              {/* Place Details Popup */}
              {selectedWaypoint && (
                <Popup
                  longitude={selectedWaypoint.longitude}
                  latitude={selectedWaypoint.latitude}
                  anchor="top"
                  offset={30}
                  onClose={() => {
                    setSelectedWaypoint(null);
                    setPlaceDetails(null);
                  }}
                  closeButton={true}
                  closeOnClick={false}
                  className="place-details-popup"
                  maxWidth="260px"
                >
                  <div className="min-w-[240px] max-w-[260px]">
                    {isLoadingPlaceDetails ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1C4633] mx-auto mb-2"></div>
                          <p className="text-xs text-gray-500">Loading...</p>
                        </div>
                      </div>
                    ) : placeDetails ? (
                      <div>
                        {/* Photo Section */}
                        {placeDetails.photos && placeDetails.photos.length > 0 && (
                          <div className="relative h-24 w-full overflow-hidden">
                            <img
                              src={`${process.env.NEXT_PUBLIC_API_URL || 'http://13.53.168.27:5000'}/api/config/place-photo?photoReference=${encodeURIComponent(placeDetails.photos[0].photo_reference)}&maxWidth=400`}
                              alt={placeDetails.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            {/* Gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            {/* Rating badge on photo */}
                            {placeDetails.rating && (
                              <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-md shadow-md">
                                <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                <span className="font-bold text-xs text-gray-800">{placeDetails.rating.toFixed(1)}</span>
                                {placeDetails.user_ratings_total && (
                                  <span className="text-[10px] text-gray-500">({placeDetails.user_ratings_total})</span>
                                )}
                              </div>
                            )}
                            {/* Open/Closed badge */}
                            {placeDetails.opening_hours && (
                              <div className={`absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-semibold shadow-md ${
                                placeDetails.opening_hours.open_now 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-red-500 text-white'
                              }`}>
                                {placeDetails.opening_hours.open_now ? 'Open' : 'Closed'}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Content Section */}
                        <div className="p-3 space-y-2">
                          {/* Place Name */}
                          <h3 className="font-bold text-base text-[#1C4633] leading-tight">{placeDetails.name}</h3>
                          
                          {/* Types/Categories */}
                          {placeDetails.types && placeDetails.types.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {placeDetails.types.slice(0, 2).map((type, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-[#1C4633]/10 text-[#1C4633] text-[10px] rounded-full capitalize">
                                  {type.replace(/_/g, ' ')}
                                </span>
                              ))}
                              {placeDetails.price_level && (
                                <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] rounded-full">
                                  {'$'.repeat(placeDetails.price_level)}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Rating (only if no photo) */}
                          {placeDetails.rating && (!placeDetails.photos || placeDetails.photos.length === 0) && (
                            <div className="flex items-center gap-1.5">
                              <div className="flex items-center gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <svg
                                    key={i}
                                    className={`w-3 h-3 ${i < Math.round(placeDetails.rating!) ? 'text-yellow-400' : 'text-gray-300'}`}
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                              <span className="text-xs font-semibold text-gray-700">{placeDetails.rating.toFixed(1)}</span>
                              {placeDetails.user_ratings_total && (
                                <span className="text-[10px] text-gray-500">({placeDetails.user_ratings_total})</span>
                              )}
                            </div>
                          )}

                          {/* Address */}
                          {placeDetails.formatted_address && (
                            <div className="flex items-start gap-1.5 text-xs text-gray-600">
                              <svg className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="line-clamp-2">{placeDetails.formatted_address}</span>
                            </div>
                          )}

                          {/* Phone */}
                          {placeDetails.formatted_phone_number && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                              <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <a href={`tel:${placeDetails.formatted_phone_number}`} className="text-[#1C4633] hover:underline font-medium">
                                {placeDetails.formatted_phone_number}
                              </a>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-1.5 pt-2 border-t border-gray-100">
                            {placeDetails.website && (
                              <a
                                href={placeDetails.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-[#1C4633] text-white text-xs font-medium rounded-lg hover:bg-[#153726] transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                                Website
                              </a>
                            )}
                            {placeDetails.url && (
                              <a
                                href={placeDetails.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                </svg>
                                Maps
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Fallback when no placeId or details not available */
                      <div className="p-3 pt-6 space-y-1.5">
                        <h3 className="font-bold text-sm text-[#1C4633] pr-6 leading-tight">
                          {selectedWaypoint.name || `Stop ${selectedWaypoint.index + 1}`}
                        </h3>
                        {selectedWaypoint.category && (
                          <span className="inline-block px-1.5 py-0.5 bg-[#1C4633]/10 text-[#1C4633] text-[10px] rounded-full capitalize">
                            {selectedWaypoint.category.replace(/_/g, ' ')}
                          </span>
                        )}
                        {selectedWaypoint.address && (
                          <p className="text-xs text-gray-600 leading-snug">{selectedWaypoint.address}</p>
                        )}
                        <p className="text-[10px] text-gray-400">
                          {selectedWaypoint.latitude.toFixed(5)}, {selectedWaypoint.longitude.toFixed(5)}
                        </p>
                        {!selectedWaypoint.placeId && (
                          <p className="text-[10px] text-gray-400 italic">
                            Detailed info not available
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </Popup>
              )}
                  </Map>
                </div>
              </div>

              {/* Right Side - Rating + Trip Stops (1 column) */}
              <div className="lg:col-span-1 space-y-4">
                {/* Rating Section - Compact */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-[#1C4633] flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#DA922B]" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Rate this Route
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <span className="font-semibold text-[#1C4633]">{travelPlan.averageRating.toFixed(1)}</span>
                        <span>({travelPlan.totalRatings} ratings)</span>
                      </div>
                    </div>
                    <StarRating
                      travelPlanId={travelPlan.travelPlanID}
                      averageRating={travelPlan.averageRating}
                      totalRatings={travelPlan.totalRatings}
                      onRatingChange={handleRatingChange}
                    />
                  </div>
                </div>

                {/* Trip Stops Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden h-[580px] flex flex-col">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#1C4633]/5 to-transparent flex-shrink-0">
                    <h3 className="text-lg font-bold text-[#1C4633] flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Trip Stops
                      <span className="ml-auto bg-[#1C4633]/10 text-[#1C4633] text-sm font-medium px-2.5 py-0.5 rounded-full">
                        {waypoints.length}
                      </span>
                    </h3>
                  </div>
                  <div className="p-4 overflow-y-auto custom-scrollbar" style={{ height: 'calc(580px - 73px)' }}>
                    {waypoints.length > 0 ? (
                      <div className="space-y-3">
                        {waypoints.map((waypoint, index) => {
                          const isStart = index === 0;
                          const isEnd = index === waypoints.length - 1;
                          const isSelected = selectedWaypoint?.index === index;
                          
                          return (
                            <div
                              key={index}
                              onClick={() => handleWaypointClick(waypoint, index)}
                              className={`p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md cursor-pointer ${
                                isSelected
                                  ? 'ring-2 ring-[#1C4633] ring-offset-2 shadow-lg'
                                  : ''
                              } ${
                                isStart 
                                  ? 'bg-gradient-to-r from-green-50 to-white border-green-200 hover:border-green-400' 
                                  : isEnd 
                                  ? 'bg-gradient-to-r from-red-50 to-white border-red-200 hover:border-red-400'
                                  : 'bg-gray-50/50 border-gray-200/60 hover:border-[#DA922B]/40'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-md flex-shrink-0 ${
                                    isStart
                                      ? 'bg-gradient-to-br from-green-500 to-green-600'
                                      : isEnd
                                      ? 'bg-gradient-to-br from-red-500 to-red-600'
                                      : 'bg-gradient-to-br from-[#DA922B] to-[#c77f1f]'
                                  }`}
                                >
                                  {isStart ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                                    </svg>
                                  ) : isEnd ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                                    </svg>
                                  ) : (
                                    index + 1
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-semibold uppercase tracking-wide ${
                                      isStart ? 'text-green-600' : isEnd ? 'text-red-600' : 'text-[#DA922B]'
                                    }`}>
                                      {isStart ? 'Start Point' : isEnd ? 'End Point' : `Stop ${index + 1}`}
                                    </span>
                                  </div>
                                  {waypoint.name ? (
                                    <>
                                      <div className="font-semibold text-[#1C4633] text-base">{waypoint.name}</div>
                                      {waypoint.category && (
                                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                          </svg>
                                          {waypoint.category}
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <div className="text-sm text-gray-500 font-mono">
                                      {waypoint.latitude.toFixed(5)}, {waypoint.longitude.toFixed(5)}
                                    </div>
                                  )}
                                  {waypoint.address && (
                                    <div className="text-sm text-gray-600 mt-2 flex items-start gap-1.5">
                                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      </svg>
                                      <span className="line-clamp-2">{waypoint.address}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <p className="text-lg font-medium">No stops available</p>
                        <p className="text-sm">This route doesn't have any defined stops yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Comments Section - Full Width Below */}
            <div className="mt-5">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#1C4633]/5 to-transparent">
                  <h3 className="text-xl font-bold text-[#1C4633] flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Comments
                  </h3>
                </div>
                <div className="p-6">
                  <CommentBox travelPlanId={travelPlan.travelPlanID} />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
        }}
        onConfirm={handleDelete}
        title="Delete Route"
        message="Are you sure you want to delete this route? This action cannot be undone."
        itemName={travelPlan.title}
      />

      {/* Edit Route Modal */}
      <RouteEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        travelPlan={travelPlan}
        onSave={handleEditSave}
      />
    </div>
  );
}

export default function RouteDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F4F4F2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1C4633] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <RouteDetailPageContent />
    </Suspense>
  );
}
