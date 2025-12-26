'use client';

import React from 'react';

interface MapControlsProps {
  onStyleChange: (style: string) => void;
  currentStyle: string;
  onFullscreen: () => void;
  isFullscreen: boolean;
}

const mapStyles = [
  { value: 'mapbox://styles/mapbox/streets-v12', label: 'Yol Haritası' },
  { value: 'mapbox://styles/mapbox/satellite-v9', label: 'Uydu' },
  { value: 'mapbox://styles/mapbox/dark-v11', label: 'Karanlık' },
  { value: 'mapbox://styles/mapbox/outdoors-v12', label: 'Doğa' },
];

export default function MapControls({ onStyleChange, currentStyle, onFullscreen, isFullscreen }: MapControlsProps) {
  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
      {/* Harita Stili Seçici */}
      <div className="bg-white rounded-lg shadow-lg p-2">
        <select
          value={currentStyle}
          onChange={(e) => onStyleChange(e.target.value)}
          className="text-sm border border-gray-300 rounded px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#1e3a2e]"
        >
          {mapStyles.map((style) => (
            <option key={style.value} value={style.value}>
              {style.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tam Ekran Butonu */}
      <button
        onClick={onFullscreen}
        className="bg-white rounded-lg shadow-lg p-3 hover:bg-gray-50 transition-colors"
        title={isFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekran'}
      >
        {isFullscreen ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        )}
      </button>
    </div>
  );
}


