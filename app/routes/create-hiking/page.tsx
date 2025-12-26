'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Map, Marker, Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Header from '@/app/components/Header';
import Sidebar from '@/app/components/Sidebar';
import WeatherWidget from '@/app/components/WeatherWidget';
import { useAuth } from '@/contexts/AuthContext';
import { travelPlansApi, CoordinateDto, CreateTravelPlanRequest } from '@/lib/api/travelPlans';

interface Waypoint {
  id: string;
  latitude: number;
  longitude: number;
}

interface RouteInfo {
  distance: number;
  duration: number;
  elevation?: number; // Total elevation gain in meters
}

const difficultyColors: { [key: number]: string } = {
  1: '#10B981', // Easy - Green
  2: '#FCD34D', // Medium - Yellow
  3: '#EF4444', // Hard - Red
};

const difficultyOptions = [
  { value: 1, label: 'Easy' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'Hard' },
];


const mapStyles = [
  { value: 'mapbox://styles/mapbox/outdoors-v12', label: 'Outdoors' },
  { value: 'mapbox://styles/mapbox/satellite-v9', label: 'Satellite' },
];

function CreateHikingRoutePageContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const mapRef = useRef<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [locationRequested, setLocationRequested] = useState(false);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Mapbox token from environment
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

  // Map state
  const [viewState, setViewState] = useState({
    longitude: 33.3823, // Default to KKTC
    latitude: 35.1856,
    zoom: 10,
    transitionDuration: 300,
  });

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Waypoints state (for hiking, we use waypoints instead of stops)
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [currentRouteGeoJSON, setCurrentRouteGeoJSON] = useState<any>(null);
  const [currentRouteInfo, setCurrentRouteInfo] = useState<RouteInfo | null>(null);

  // User location state
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 1,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isClickMode, setIsClickMode] = useState(true); // Enable map clicking by default (Drawing mode)
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/outdoors-v12'); // Default to outdoors style
  const [mapMode, setMapMode] = useState<'drawing' | 'navigation'>('drawing'); // Drawing or Navigation mode

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

  // Calculate route when waypoints change
  useEffect(() => {
    if (waypoints.length >= 2 && mapboxToken) {
      calculateRoute();
    } else {
      setCurrentRouteGeoJSON(null);
      setCurrentRouteInfo(null);
    }
  }, [waypoints, mapboxToken]);

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
    } else if (waypoints.length > 0) {
      // Center on waypoints
      const avgLat = waypoints.reduce((sum, wp) => sum + wp.latitude, 0) / waypoints.length;
      const avgLng = waypoints.reduce((sum, wp) => sum + wp.longitude, 0) / waypoints.length;
      setViewState((prev) => ({
        ...prev,
        longitude: avgLng,
        latitude: avgLat,
        zoom: 13,
        transitionDuration: 300,
      }));
    }
  };

  // Calculate elevation gain from route geometry using Mapbox Terrain API
  const calculateElevation = async (geometry: any): Promise<number> => {
    if (!mapboxToken || !geometry || !geometry.coordinates || geometry.coordinates.length < 2) {
      return 0;
    }

    try {
      // Sample coordinates from route geometry (every Nth point for performance)
      const coordinates = geometry.coordinates;
      const sampleRate = Math.max(1, Math.floor(coordinates.length / 50)); // Sample up to 50 points
      const sampledCoords = coordinates.filter((_: any, index: number) => index % sampleRate === 0);
      
      // If we sampled, always include the last coordinate
      if (sampledCoords.length > 0 && sampledCoords[sampledCoords.length - 1] !== coordinates[coordinates.length - 1]) {
        sampledCoords.push(coordinates[coordinates.length - 1]);
      }

      const elevations: number[] = [];

      // Get elevation for each sampled coordinate
      for (const coord of sampledCoords) {
        const [lng, lat] = coord;
        try {
          const elevationUrl = `https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery/${lng},${lat}.json?access_token=${mapboxToken}`;
          const elevationResponse = await fetch(elevationUrl);
          const elevationData = await elevationResponse.json();
          
          if (elevationData.features && elevationData.features.length > 0 && elevationData.features[0].properties) {
            const elevation = elevationData.features[0].properties.ele;
            if (typeof elevation === 'number') {
              elevations.push(elevation);
            }
          }
        } catch (err) {
          console.warn('Error fetching elevation for coordinate:', err);
        }
      }

      if (elevations.length < 2) {
        return 0;
      }

      // Calculate total elevation gain (sum of all positive elevation changes)
      let totalGain = 0;
      for (let i = 1; i < elevations.length; i++) {
        const elevationChange = elevations[i] - elevations[i - 1];
        if (elevationChange > 0) {
          totalGain += elevationChange;
        }
      }

      return Math.round(totalGain);
    } catch (error) {
      console.error('Error calculating elevation:', error);
      return 0;
    }
  };

  // Calculate route from waypoints using Mapbox Directions API with WALKING profile
  const calculateRoute = async () => {
    if (!mapboxToken || waypoints.length < 2) return;

    const coordinates = waypoints.map((wp) => `${wp.longitude},${wp.latitude}`).join(';');
    const profile = 'walking'; // Use walking profile for hiking routes
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
        
        // Calculate elevation gain
        const elevation = await calculateElevation(data.geometry);
        
        setCurrentRouteInfo({
          distance: data.distance,
          duration: data.duration,
          elevation: elevation,
        });
      } else {
        console.warn('No routes found');
        setCurrentRouteGeoJSON(null);
        setCurrentRouteInfo(null);
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      setError('Failed to calculate route. Please try again.');
    }
  };

  // Handle map click to add waypoint
  const handleMapClick = useCallback((event: any) => {
    if (!isClickMode) return;

    const { lng, lat } = event.lngLat;
    const newWaypoint: Waypoint = {
      id: Date.now().toString(),
      latitude: lat,
      longitude: lng,
    };

    setWaypoints((prev) => [...prev, newWaypoint]);
    setError('');
  }, [isClickMode]);

  // Remove waypoint
  const removeWaypoint = (waypointId: string) => {
    setWaypoints((prev) => prev.filter((wp) => wp.id !== waypointId));
  };

  // Move waypoint up/down in order
  const moveWaypoint = (waypointId: string, direction: 'up' | 'down') => {
    setWaypoints((prev) => {
      const index = prev.findIndex((wp) => wp.id === waypointId);
      if (index === -1) return prev;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;

      const newWaypoints = [...prev];
      [newWaypoints[index], newWaypoints[newIndex]] = [newWaypoints[newIndex], newWaypoints[index]];
      return newWaypoints;
    });
  };

  // Clear all waypoints
  const clearWaypoints = () => {
    setWaypoints([]);
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

    if (waypoints.length < 2) {
      setError('Please add at least 2 waypoints to create a hiking route.');
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

      // Convert waypoints to stops format (for consistency with backend)
      const stops = waypoints.map((wp, index) => ({
        id: wp.id,
        name: `Waypoint ${index + 1}`,
        address: `${wp.latitude.toFixed(6)}, ${wp.longitude.toFixed(6)}`,
        latitude: wp.latitude,
        longitude: wp.longitude,
        category: null,
      }));

      const request: CreateTravelPlanRequest = {
        title: formData.title,
        description: formData.description,
        type: 2, // Hike = 2
        difficulty: formData.difficulty,
        totalDistanceInMeters: currentRouteInfo?.distance || null,
        routePath: coordinates,
        stops: stops,
      };

      await travelPlansApi.create(request);
      router.push('/routes');
    } catch (err: any) {
      console.error('Error creating hiking route:', err);
      setError(err.message || 'Error saving hiking route.');
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
                    <label className="block text-sm font-semibold text-[#1C4633] mb-2">Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3 bg-[#F4F4F2] border border-[#1C4633]/20 rounded-xl focus:ring-2 focus:ring-[#1C4633]/30 focus:border-[#1C4633] outline-none text-gray-900 transition-all placeholder:text-gray-400"
                      placeholder="Enter hiking route title"
                      required
                    />
                  </div>

                  {/* Difficulty and Save Button */}
                  <div className="flex items-end gap-3 md:ml-auto">
                    <div>
                      <label className="block text-sm font-semibold text-[#1C4633] mb-2">Difficulty</label>
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
                      disabled={isSubmitting || waypoints.length < 2}
                      className="px-6 py-2.5 bg-[#DA922B] text-white rounded-xl hover:bg-[#DA922B]/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md hover:shadow-lg disabled:hover:shadow-md whitespace-nowrap"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Route'}
                    </button>
                  </div>
                </div>

                {/* Route Info Display */}
                {waypoints.length >= 2 && (
                  <div className="mt-4 pt-4 border-t border-[#1C4633]/10">
                    {currentRouteInfo ? (
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#1C4633]"></div>
                          <span className="text-sm text-gray-600">Distance:</span>
                          <span className="text-sm font-semibold text-[#1C4633]">
                            {(currentRouteInfo.distance / 1000).toFixed(2)} km
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#DA922B]"></div>
                          <span className="text-sm text-gray-600">Est. Time:</span>
                          <span className="text-sm font-semibold text-[#1C4633]">
                            {Math.floor(currentRouteInfo.duration / 60)} min
                          </span>
                        </div>
                        {currentRouteInfo.elevation !== undefined && (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
                            <span className="text-sm text-gray-600">Elevation Gain:</span>
                            <span className="text-sm font-semibold text-[#1C4633]">
                              {currentRouteInfo.elevation} m
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#1C4633]"></div>
                          <span className="text-sm text-gray-600">Waypoints:</span>
                          <span className="text-sm font-semibold text-[#1C4633]">{waypoints.length}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 italic">Calculating route...</div>
                    )}
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Map and Waypoints Panel */}
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
                onMove={(evt: any) => setViewState({ ...evt.viewState, transitionDuration: 0 })}
                onClick={handleMapClick}
                mapboxAccessToken={mapboxToken}
                style={{ width: '100%', height: '100%', cursor: isClickMode ? 'crosshair' : 'default' }}
                mapStyle={mapStyle}
                cursor={mapMode === 'drawing' && isClickMode ? 'crosshair' : 'default'}
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

                {/* Waypoint Markers */}
                {waypoints.map((waypoint, index) => {
                  const isStart = index === 0;
                  const isEnd = index === waypoints.length - 1;
                  return (
                    <Marker key={waypoint.id} longitude={waypoint.longitude} latitude={waypoint.latitude}>
                      <div className="relative">
                        <div
                          className={`w-10 h-10 rounded-full border-2 border-white shadow-lg flex items-center justify-center font-bold text-white text-sm ${
                            isStart
                              ? 'bg-green-600'
                              : isEnd
                              ? 'bg-red-600'
                              : 'bg-[#DA922B]'
                          }`}
                        >
                          {isStart ? 'S' : isEnd ? 'E' : index}
                        </div>
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#DA922B]"></div>
                      </div>
                    </Marker>
                  );
                })}

                {/* Route Line */}
                {currentRouteGeoJSON && (
                  <Source id="route" type="geojson" data={currentRouteGeoJSON}>
                    <Layer
                      id="route-line"
                      type="line"
                      paint={{
                        'line-color': difficultyColors[formData.difficulty] || '#1C4633',
                        'line-width': 5,
                        'line-opacity': 0.9,
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

              {/* Map Mode Controls - Right Side */}
              <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                {/* Map Mode Toggle (Drawing / Navigation) */}
                <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-lg shadow-lg overflow-hidden w-[220px]">
                  <div className="flex">
                    <button
                      onClick={() => {
                        setMapMode('drawing');
                        setIsClickMode(true);
                      }}
                      className={`flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                        mapMode === 'drawing'
                          ? 'bg-[#1C4633] text-white'
                          : 'bg-transparent text-gray-700 hover:bg-white/50'
                      }`}
                      title="Drawing Mode"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Drawing
                    </button>
                    <button
                      onClick={() => {
                        setMapMode('navigation');
                        setIsClickMode(false);
                      }}
                      className={`flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border-l border-white/30 ${
                        mapMode === 'navigation'
                          ? 'bg-[#1C4633] text-white'
                          : 'bg-transparent text-gray-700 hover:bg-white/50'
                      }`}
                      title="Navigation Mode"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      Navigation
                    </button>
                  </div>
                </div>

                {/* Map Style Selector + Zoom Controls - Below Mode Toggle */}
                <div className="flex flex-col gap-2">
                  {/* Map Style Buttons - Side by Side */}
                  <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-lg shadow-lg overflow-hidden w-[220px]">
                    <div className="flex">
                      {mapStyles.map((style, index) => (
                        <button
                          key={style.value}
                          onClick={() => setMapStyle(style.value)}
                          className={`flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                            mapStyle === style.value
                              ? 'bg-[#1C4633] text-white'
                              : 'bg-transparent text-gray-700 hover:bg-white/50'
                          } ${index > 0 ? 'border-l border-white/30' : ''}`}
                          title={style.label}
                        >
                          {style.value.includes('satellite') ? (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                          )}
                          {style.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Zoom and Location Buttons - Horizontal */}
                  <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-lg shadow-lg overflow-hidden w-[220px]">
                    <div className="flex">
                      <button
                        onClick={handleZoomIn}
                        className="flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center hover:bg-white/60 transition-colors"
                        title="Zoom In"
                      >
                        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      </button>
                      <button
                        onClick={handleZoomOut}
                        className="flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center border-l border-white/30 hover:bg-white/60 transition-colors"
                        title="Zoom Out"
                      >
                        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                        </svg>
                      </button>
                      <button
                        onClick={handleCenterMap}
                        className="flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center border-l border-white/30 hover:bg-white/60 transition-colors"
                        title="Center Map"
                      >
                        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Description and Waypoints List */}
            <div className="w-96 bg-white border-l border-[#1C4633]/10 flex flex-col">
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
                  placeholder="Describe your hiking route..."
                  rows={4}
                  style={{
                    minHeight: '100px',
                    height: '100px',
                  }}
                />
              </div>

              {/* Waypoints List */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-[#1C4633]">Waypoints</h3>
                  {waypoints.length > 0 && (
                    <button
                      onClick={clearWaypoints}
                      className="text-sm text-red-600 hover:text-red-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>

              {waypoints.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F4F4F2] flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="font-medium mb-1">No waypoints added yet</p>
                  <p className="text-sm text-gray-400">Switch to Drawing mode and click on the map</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {waypoints.map((waypoint, index) => {
                    const isStart = index === 0;
                    const isEnd = index === waypoints.length - 1;
                    return (
                      <div
                        key={waypoint.id}
                        className="p-4 bg-[#F4F4F2] rounded-xl border border-[#1C4633]/10 hover:border-[#1C4633]/20 transition-all"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-md ${
                                isStart
                                  ? 'bg-green-600'
                                  : isEnd
                                  ? 'bg-red-600'
                                  : 'bg-[#DA922B]'
                              }`}
                            >
                              {isStart ? 'S' : isEnd ? 'E' : index}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-[#1C4633] text-sm">
                                {isStart ? 'Start Point' : isEnd ? 'End Point' : `Waypoint ${index}`}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {waypoint.latitude.toFixed(6)}, {waypoint.longitude.toFixed(6)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => moveWaypoint(waypoint.id, 'up')}
                              disabled={index === 0}
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
                                <path d="M6 3L3 6H9L6 3Z" fill="currentColor" />
                              </svg>
                            </button>
                            <button
                              onClick={() => moveWaypoint(waypoint.id, 'down')}
                              disabled={index === waypoints.length - 1}
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
                                <path d="M6 9L3 6H9L6 9Z" fill="currentColor" />
                              </svg>
                            </button>
                            <button
                              onClick={() => removeWaypoint(waypoint.id)}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove waypoint"
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
                  })}
                </div>
              )}
              </div>
              </div>
            </div>
        </main>
      </div>
    </div>
  );
}

export default function CreateHikingRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F4F4F2] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1C4633] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <CreateHikingRoutePageContent />
    </Suspense>
  );
}

