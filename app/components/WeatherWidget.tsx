'use client';

import { useState, useEffect, useRef } from 'react';

interface WeatherData {
  temp: number;
  feels_like: number;
  humidity: number;
  description: string;
  icon: string;
  wind_speed: number;
  city: string;
}

interface WeatherWidgetProps {
  latitude: number;
  longitude: number;
  className?: string;
}

const weatherIcons: { [key: string]: JSX.Element } = {
  '01d': ( // clear sky day
    <svg className="w-8 h-8 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  ),
  '01n': ( // clear sky night
    <svg className="w-8 h-8 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  '02d': ( // few clouds day
    <svg className="w-8 h-8 text-yellow-400" viewBox="0 0 24 24" fill="none">
      <circle cx="8" cy="8" r="4" fill="currentColor" />
      <path d="M8 2v1M8 13v1M2 8h1M13 8h1M3.76 3.76l.7.7M11.54 11.54l.7.7M3.76 12.24l.7-.7M11.54 4.46l.7-.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18 19H8a4 4 0 0 1 0-8h.5a5.5 5.5 0 0 1 10.5 3 3 3 0 0 1-1 5z" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.5" />
    </svg>
  ),
  '02n': ( // few clouds night
    <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none">
      <path d="M12 3a7 7 0 0 0 7 7 5 5 0 0 1-7-7z" fill="currentColor" />
      <path d="M18 19H8a4 4 0 0 1 0-8h.5a5.5 5.5 0 0 1 10.5 3 3 3 0 0 1-1 5z" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.5" />
    </svg>
  ),
  '03d': ( // scattered clouds
    <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  ),
  '03n': ( // scattered clouds night
    <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  ),
  '04d': ( // broken clouds
    <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  ),
  '04n': ( // broken clouds night
    <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  ),
  '09d': ( // shower rain
    <svg className="w-8 h-8 text-blue-400" viewBox="0 0 24 24" fill="none">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="#9ca3af" />
      <path d="M8 21v2M12 21v2M16 21v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  '09n': ( // shower rain night
    <svg className="w-8 h-8 text-blue-400" viewBox="0 0 24 24" fill="none">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="#6b7280" />
      <path d="M8 21v2M12 21v2M16 21v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  '10d': ( // rain day
    <svg className="w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="none">
      <circle cx="8" cy="6" r="3" fill="#fbbf24" />
      <path d="M18 12h-1.26A7 7 0 1 0 9 18h9a4 4 0 0 0 0-8z" fill="#9ca3af" />
      <path d="M8 20v2M12 20v2M16 20v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  '10n': ( // rain night
    <svg className="w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="none">
      <path d="M18 12h-1.26A7 7 0 1 0 9 18h9a4 4 0 0 0 0-8z" fill="#6b7280" />
      <path d="M8 20v2M12 20v2M16 20v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  '11d': ( // thunderstorm
    <svg className="w-8 h-8 text-yellow-500" viewBox="0 0 24 24" fill="none">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="#6b7280" />
      <path d="M13 11l-2 4h3l-2 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  '11n': ( // thunderstorm night
    <svg className="w-8 h-8 text-yellow-400" viewBox="0 0 24 24" fill="none">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="#4b5563" />
      <path d="M13 11l-2 4h3l-2 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  '13d': ( // snow
    <svg className="w-8 h-8 text-blue-200" viewBox="0 0 24 24" fill="none">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="#d1d5db" />
      <circle cx="8" cy="22" r="1" fill="currentColor" />
      <circle cx="12" cy="21" r="1" fill="currentColor" />
      <circle cx="16" cy="22" r="1" fill="currentColor" />
    </svg>
  ),
  '13n': ( // snow night
    <svg className="w-8 h-8 text-blue-100" viewBox="0 0 24 24" fill="none">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="#9ca3af" />
      <circle cx="8" cy="22" r="1" fill="currentColor" />
      <circle cx="12" cy="21" r="1" fill="currentColor" />
      <circle cx="16" cy="22" r="1" fill="currentColor" />
    </svg>
  ),
  '50d': ( // mist
    <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none">
      <path d="M4 8h16M4 12h16M4 16h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  '50n': ( // mist night
    <svg className="w-8 h-8 text-gray-500" viewBox="0 0 24 24" fill="none">
      <path d="M4 8h16M4 12h16M4 16h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

const defaultIcon = (
  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
  </svg>
);

export default function WeatherWidget({ latitude, longitude, className = '' }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const isInitialLoadRef = useRef(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastCoordinatesRef = useRef<{ lat: number; lon: number } | null>(null);
  const cacheRef = useRef<{ lat: number; lon: number; data: WeatherData; timestamp: number } | null>(null);

  // Coordinate change threshold - for cache matching (rounded to 0.01 degrees ~1km)
  const CACHE_COORDINATE_THRESHOLD = 0.01;
  // Cache duration - 10 minutes (600000 ms)
  const CACHE_DURATION = 10 * 60 * 1000;
  // Debounce delay - 2 seconds after map movement stops
  const DEBOUNCE_DELAY = 2000;

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Round coordinates for cache key (to group nearby locations)
        const roundedLat = Math.round(latitude * 100) / 100;
        const roundedLon = Math.round(longitude * 100) / 100;
        
        // Check cache first using rounded coordinates
        if (cacheRef.current) {
          const cacheAge = Date.now() - cacheRef.current.timestamp;
          const cachedRoundedLat = Math.round(cacheRef.current.lat * 100) / 100;
          const cachedRoundedLon = Math.round(cacheRef.current.lon * 100) / 100;
          const latDiff = Math.abs(cachedRoundedLat - roundedLat);
          const lonDiff = Math.abs(cachedRoundedLon - roundedLon);
          
          // Use cache if same location (within threshold) and less than 10 minutes old
          if (cacheAge < CACHE_DURATION && latDiff < CACHE_COORDINATE_THRESHOLD && lonDiff < CACHE_COORDINATE_THRESHOLD) {
            setWeather(cacheRef.current.data);
            setIsLoading(false);
            return;
          }
        }
        
        // Always fetch from backend to keep API key secure
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://routecraft.duckdns.org';
        const response = await fetch(
          `${backendUrl}/api/config/weather?lat=${latitude}&lon=${longitude}`
        );
        
        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
            console.error('Weather API error:', response.status, errorData);
            // Check if it's an API key error
            if (errorData.details && errorData.details.includes('401')) {
              console.warn('OpenWeatherMap API key might be invalid or not activated yet. Please check the API key.');
            }
          } catch {
            const errorText = await response.text();
            console.error('Weather API error:', response.status, errorText);
          }
          throw new Error('Weather data not available');
        }
        
        const data = await response.json();
        const weatherData = {
          temp: Math.round(data.main.temp),
          feels_like: Math.round(data.main.feels_like),
          humidity: data.main.humidity,
          description: data.weather[0].description,
          icon: data.weather[0].icon,
          wind_speed: Math.round((data.wind?.speed || 0) * 3.6), // m/s to km/h
          city: data.name,
        };
        
        setWeather(weatherData);
        
        // Cache the result with actual coordinates
        cacheRef.current = {
          lat: latitude,
          lon: longitude,
          data: weatherData,
          timestamp: Date.now(),
        };
      } catch (err) {
        console.error('Error fetching weather:', err);
        setError('Weather unavailable');
      } finally {
        setIsLoading(false);
      }
    };

    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      setIsLoading(false);
      setError('Invalid coordinates');
      return;
    }

    // Update last coordinates immediately
    lastCoordinatesRef.current = { lat: latitude, lon: longitude };

    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // For initial load, fetch immediately
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      fetchWeather();
      return;
    }

    // For subsequent coordinate changes, debounce for 2 seconds (reduced from 5)
    // This allows the widget to update when map movement stops
    debounceTimerRef.current = setTimeout(() => {
      fetchWeather();
    }, DEBOUNCE_DELAY);

    // Cleanup timer on coordinate change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [latitude, longitude]);

  if (isLoading) {
    return (
      <div className={`bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-3 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
          <div className="space-y-1">
            <div className="w-12 h-4 bg-gray-200 rounded animate-pulse" />
            <div className="w-16 h-3 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className={`bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-3 ${className}`}>
        <div className="flex items-center gap-2 text-gray-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
          <span className="text-xs">Weather N/A</span>
        </div>
      </div>
    );
  }

  const icon = weatherIcons[weather.icon] || defaultIcon;

  return (
    <div 
      className={`bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 cursor-pointer ${className}`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Compact View */}
      <div className="p-3 flex items-center gap-3">
        {icon}
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-800">{weather.temp}°</span>
            <span className="text-xs text-gray-500">C</span>
          </div>
          <p className="text-xs text-gray-500 capitalize">{weather.description}</p>
        </div>
        <svg 
          className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-gray-600">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {weather.city}
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Feels {weather.feels_like}°
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              {weather.humidity}%
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              {weather.wind_speed} km/h
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

