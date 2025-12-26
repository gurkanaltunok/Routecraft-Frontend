// src/routecraft-web/app/components/Map.tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Map, { Marker, Source, Layer, Popup } from 'react-map-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { travelPlansApi, TravelPlanDto, CreateTravelPlanRequest, CoordinateDto } from '@/lib/api/travelPlans';
import { useAuth } from '@/contexts/AuthContext';
import MapControls from './MapControls';
import RoutePopup from './RoutePopup';
import CreateRouteModal from './CreateRouteModal';

// Colors for route types
const routeTypeColors: Record<number, string> = {
  1: '#0074D9', // Trip - Blue
  2: '#2ECC40', // Hiking - Green
};

// Difficulty level colors
const difficultyColors: Record<number, string> = {
  1: '#2ECC40', // Easy - Green
  2: '#FFDC00', // Medium - Yellow
  3: '#FF4136', // Hard - Red
};

// Route line style
const getRouteLayerStyle = (difficulty: number, type: number) => ({
  id: `route-${difficulty}-${type}`,
  type: 'line' as const,
  paint: {
    'line-color': difficultyColors[difficulty] || routeTypeColors[type] || '#0074D9',
    'line-width': 6,
    'line-opacity': 0.8,
  },
});

function AppMap() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const mapRef = React.useRef<any>(null);
  const geocoderRef = React.useRef<MapboxGeocoder | null>(null);

  // Harita state
  const [viewState, setViewState] = React.useState({
    longitude: 33.3823,
    latitude: 35.1856,
    zoom: 9,
  });
  const [mapStyle, setMapStyle] = React.useState('mapbox://styles/mapbox/streets-v12');
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // Route drawing state
  const [routeMode, setRouteMode] = React.useState<'none' | 'drawing' | 'viewing'>('none');
  const [routeType, setRouteType] = React.useState<'driving' | 'walking' | 'cycling'>('driving');
  const [waypoints, setWaypoints] = React.useState<Array<{lat: number, lng: number, id: string}>>([]);
  const [currentRouteGeoJSON, setCurrentRouteGeoJSON] = React.useState<any>(null);
  const [currentRouteInfo, setCurrentRouteInfo] = React.useState<{distance: number, duration: number} | null>(null);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<TravelPlanDto | null>(null);

  // Saved routes
  const [travelPlans, setTravelPlans] = React.useState<TravelPlanDto[]>([]);
  const [filteredPlans, setFilteredPlans] = React.useState<TravelPlanDto[]>([]);
  const [selectedPlan, setSelectedPlan] = React.useState<TravelPlanDto | null>(null);
  const [popupLocation, setPopupLocation] = React.useState<{lng: number, lat: number} | null>(null);
  const [isLoadingPlans, setIsLoadingPlans] = React.useState(false);

  // Filtering
  const [filters, setFilters] = React.useState({
    type: 0, // 0 = all
    difficulty: 0, // 0 = all
    search: '',
  });

  // User location
  const [userLocation, setUserLocation] = React.useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = React.useState<string | null>(null);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // Load saved routes
  React.useEffect(() => {
    loadTravelPlans();
  }, []);

  // Filtering
  React.useEffect(() => {
    let filtered = [...travelPlans];

    if (filters.type > 0) {
      filtered = filtered.filter(p => p.type === filters.type);
    }

    if (filters.difficulty > 0) {
      filtered = filtered.filter(p => p.difficulty === filters.difficulty);
    }

    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }

    setFilteredPlans(filtered);
  }, [travelPlans, filters]);

  // Add geocoder
  React.useEffect(() => {
    if (!mapRef.current || !mapboxToken) return;

    const map = mapRef.current.getMap();
    if (!map) return;

    const geocoder = new MapboxGeocoder({
      accessToken: mapboxToken,
      mapboxgl: (window as any).mapboxgl || require('mapbox-gl'),
      placeholder: 'Adres veya yer ara...',
      marker: false,
    });

    geocoderRef.current = geocoder;

    map.addControl(geocoder, 'top-left');

    geocoder.on('result', (e: any) => {
      const { center } = e.result;
      setViewState(prev => ({
        ...prev,
        longitude: center[0],
        latitude: center[1],
        zoom: 14,
      }));
    });

    return () => {
      try {
        if (map && geocoder) {
          map.removeControl(geocoder);
        }
      } catch (error) {
        console.error('Geocoder cleanup error:', error);
      }
    };
  }, [mapboxToken]);

  // Get user location
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Your browser does not support location features.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setViewState(prev => ({
          ...prev,
          longitude,
          latitude,
          zoom: 14,
        }));
        setLocationError(null);
      },
      (error) => {
        setLocationError('Konum alınamadı. Lütfen izin verin.');
        console.error('Geolocation error:', error);
      }
    );
  };

  const loadTravelPlans = async () => {
    setIsLoadingPlans(true);
    try {
      const plans = await travelPlansApi.getAll();
      setTravelPlans(plans);
    } catch (error) {
      console.error('Error loading routes:', error);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const getRoute = async (points: Array<{lng: number, lat: number}>) => {
    if (!mapboxToken || points.length < 2) return;

    const profile = routeType === 'driving' ? 'driving' : routeType === 'walking' ? 'walking' : 'cycling';
    const coordinates = points.map(p => `${p.lng},${p.lat}`).join(';');
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
      console.error('Error getting route:', error);
    }
  };

  const handleMapClick = (e: any) => {
    if (routeMode !== 'drawing') return;

    const coords = { lat: e.lngLat.lat, lng: e.lngLat.lng, id: Date.now().toString() };
    const newWaypoints = [...waypoints, coords];
    setWaypoints(newWaypoints);

    if (newWaypoints.length >= 2) {
      getRoute(newWaypoints.map(wp => ({ lng: wp.lng, lat: wp.lat })));
    }
  };

  const handleSaveRoute = async (data: CreateTravelPlanRequest) => {
    if (!currentRouteGeoJSON || !currentRouteInfo) {
      throw new Error('Route line not found.');
    }

    // GeoJSON'dan koordinatları çıkar
    const coordinates = currentRouteGeoJSON.geometry.coordinates.map((coord: [number, number]) => ({
      longitude: coord[0],
      latitude: coord[1],
    }));

    if (editingPlan) {
      // Düzenleme modu
      await travelPlansApi.update(editingPlan.travelPlanID, {
        ...data,
        totalDistanceInMeters: currentRouteInfo.distance,
        routePath: coordinates,
      });
      setEditingPlan(null);
    } else {
      // New creation
      await travelPlansApi.create({
        ...data,
        totalDistanceInMeters: currentRouteInfo.distance,
        routePath: coordinates,
      });
    }

    await loadTravelPlans();
    resetRouteDrawing();
  };

  const resetRouteDrawing = () => {
    setRouteMode('none');
    setWaypoints([]);
    setCurrentRouteGeoJSON(null);
    setCurrentRouteInfo(null);
    setShowCreateModal(false);
    setEditingPlan(null);
  };

  const startDrawingRoute = () => {
    resetRouteDrawing();
    setRouteMode('drawing');
  };

  const handlePlanMarkerClick = (plan: TravelPlanDto, lng: number, lat: number) => {
    setSelectedPlan(plan);
    setPopupLocation({ lng, lat });
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (!mapboxToken) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <h2 className="text-red-600 text-xl font-bold mb-4">Mapbox Token Required</h2>
          <p className="text-gray-700 mb-4">Mapbox token is required to display the map.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Left Panel - Controls */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-4 max-w-xs">
        <h3 className="font-bold text-lg mb-3 text-black">Controls</h3>
        
        {/* Route Drawing */}
        <div className="mb-4">
          <button
            onClick={startDrawingRoute}
            className={`w-full py-2 px-4 rounded-lg mb-2 ${
              routeMode === 'drawing' 
                ? 'bg-green-600 text-white' 
                : 'bg-[#1e3a2e] text-white hover:bg-[#2d5a3d]'
            } transition-colors`}
          >
            {routeMode === 'drawing' ? 'Drawing Route...' : 'Draw New Route'}
          </button>
          
          {routeMode === 'drawing' && (
            <>
              <div className="mb-2">
                <label className="block text-sm font-medium text-black mb-1">Route Type</label>
                <select
                  value={routeType}
                  onChange={(e) => {
                    setRouteType(e.target.value as any);
                    if (waypoints.length >= 2) {
                      getRoute(waypoints.map(wp => ({ lng: wp.lng, lat: wp.lat })));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-black text-sm font-medium"
                >
                  <option value="driving" className="text-black">Driving</option>
                  <option value="walking" className="text-black">Walking</option>
                  <option value="cycling" className="text-black">Cycling</option>
                </select>
              </div>
              
              {currentRouteInfo && (
                <div className="mb-2 p-2 bg-blue-50 rounded text-sm">
                  <div className="text-black font-semibold">Distance: {(currentRouteInfo.distance / 1000).toFixed(1)} km</div>
                  <div className="text-black font-semibold">Duration: {formatDuration(currentRouteInfo.duration)}</div>
                </div>
              )}
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateModal(true)}
                  disabled={!currentRouteGeoJSON}
                  className="flex-1 py-2 px-3 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={resetRouteDrawing}
                  className="flex-1 py-2 px-3 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>

        {/* User Location */}
        <div className="mb-4">
          <button
            onClick={getUserLocation}
            className="w-full py-2 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm"
          >
            📍 Show My Location
          </button>
          {locationError && (
            <p className="text-red-600 text-xs mt-1">{locationError}</p>
          )}
        </div>

        {/* Filtering */}
        <div className="mb-4">
          <h4 className="font-semibold text-sm mb-2 text-black">Filter</h4>
          
          <input
            type="text"
            placeholder="Search routes..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded mb-2 text-black text-sm placeholder:text-gray-500"
          />
          
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded mb-2 text-black text-sm font-medium"
          >
            <option value={0} className="text-black">All Route Types</option>
            <option value={1} className="text-black">Trip</option>
            <option value={2} className="text-black">Hiking</option>
          </select>
          
          <select
            value={filters.difficulty}
            onChange={(e) => setFilters({ ...filters, difficulty: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded text-black text-sm font-medium"
          >
            <option value={0} className="text-black">All Difficulty Levels</option>
            <option value={1} className="text-black">Easy</option>
            <option value={2} className="text-black">Medium</option>
            <option value={3} className="text-black">Hard</option>
          </select>
        </div>

        {/* Route Count */}
        <div className="text-sm text-black font-medium">
          Showing {filteredPlans.length} route(s)
        </div>
      </div>

      {/* Map Controls */}
      <MapControls
        onStyleChange={setMapStyle}
        currentStyle={mapStyle}
        onFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
      />

      {/* Map */}
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        mapboxAccessToken={mapboxToken}
        onClick={handleMapClick}
      >
        {/* User location */}
        {userLocation && (
          <Marker longitude={userLocation.lng} latitude={userLocation.lat} color="blue" anchor="center">
            <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white animate-pulse" />
          </Marker>
        )}

        {/* Drawn route waypoints */}
        {waypoints.map((wp, index) => (
          <Marker
            key={wp.id}
            longitude={wp.lng}
            latitude={wp.lat}
            color={index === 0 ? 'green' : index === waypoints.length - 1 ? 'red' : 'orange'}
            anchor="bottom"
          />
        ))}

        {/* Drawn route line */}
        {currentRouteGeoJSON && (
          <Source id="current-route" type="geojson" data={currentRouteGeoJSON}>
            <Layer {...getRouteLayerStyle(2, 1)} />
          </Source>
        )}

        {/* Saved routes */}
        {filteredPlans.map((plan) => {
          if (!plan.routePath || plan.routePath.length === 0) return null;

          const startCoord = plan.routePath[0];
          const endCoord = plan.routePath[plan.routePath.length - 1];

          return (
            <React.Fragment key={plan.travelPlanID}>
              {/* Start marker - Animated */}
              <Marker
                longitude={startCoord.longitude}
                latitude={startCoord.latitude}
                color={difficultyColors[plan.difficulty] || '#0074D9'}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  handlePlanMarkerClick(plan, startCoord.longitude, startCoord.latitude);
                }}
              >
                <div 
                  className="cursor-pointer animate-pulse"
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: difficultyColors[plan.difficulty] || '#0074D9',
                    border: '3px solid white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}
                />
              </Marker>

              {/* Route line */}
              <Source
                id={`route-${plan.travelPlanID}`}
                type="geojson"
                data={{
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: plan.routePath.map(c => [c.longitude, c.latitude]),
                  },
                }}
              >
                <Layer {...getRouteLayerStyle(plan.difficulty, plan.type)} />
              </Source>
            </React.Fragment>
          );
        })}

        {/* Popup */}
        {selectedPlan && popupLocation && (
          <Popup
            longitude={popupLocation.lng}
            latitude={popupLocation.lat}
            anchor="bottom"
            onClose={() => {
              setSelectedPlan(null);
              setPopupLocation(null);
            }}
            closeButton={true}
            closeOnClick={false}
          >
            <RoutePopup
              travelPlan={selectedPlan}
              onClose={() => {
                setSelectedPlan(null);
                setPopupLocation(null);
              }}
              onViewDetails={() => {
                router.push(`/routes/${selectedPlan.travelPlanID}`);
                setSelectedPlan(null);
                setPopupLocation(null);
              }}
              canEdit={isAuthenticated && user?.userId === selectedPlan.creatorId}
              onEdit={() => {
                // Start edit mode
                setEditingPlan(selectedPlan);
                setRouteMode('drawing');
                // Load existing route
                if (selectedPlan.routePath) {
                  const coords = selectedPlan.routePath.map((c, idx) => ({ 
                    lat: c.latitude, 
                    lng: c.longitude, 
                    id: `edit-${idx}-${Date.now()}` 
                  }));
                  setWaypoints(coords);
                  setCurrentRouteGeoJSON({
                    type: 'Feature',
                    properties: {},
                    geometry: {
                      type: 'LineString',
                      coordinates: selectedPlan.routePath.map(c => [c.longitude, c.latitude]),
                    },
                  });
                  if (selectedPlan.totalDistanceInMeters) {
                    setCurrentRouteInfo({
                      distance: selectedPlan.totalDistanceInMeters,
                      duration: 0, // Can be retrieved from API
                    });
                  }
                }
                setShowCreateModal(true);
                setSelectedPlan(null);
                setPopupLocation(null);
              }}
              onDelete={async () => {
                if (confirm('Are you sure you want to delete this route?')) {
                  try {
                    await travelPlansApi.delete(selectedPlan.travelPlanID);
                    await loadTravelPlans();
                    setSelectedPlan(null);
                    setPopupLocation(null);
                  } catch (error) {
                    alert('An error occurred while deleting the route.');
                  }
                }
              }}
            />
          </Popup>
        )}
      </Map>

      {/* Route Creation/Edit Modal */}
      <CreateRouteModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          if (editingPlan) {
            resetRouteDrawing();
          }
        }}
        onSubmit={handleSaveRoute}
        routePath={currentRouteGeoJSON?.geometry?.coordinates?.map((c: [number, number]) => ({
          longitude: c[0],
          latitude: c[1],
        })) || null}
        distance={currentRouteInfo?.distance || null}
        duration={currentRouteInfo?.duration || null}
        initialData={editingPlan ? {
          title: editingPlan.title,
          description: editingPlan.description,
          type: editingPlan.type,
          difficulty: editingPlan.difficulty,
        } : undefined}
        isEditMode={!!editingPlan}
      />
    </div>
  );
}

export default AppMap;
