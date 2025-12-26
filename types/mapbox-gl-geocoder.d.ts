declare module '@mapbox/mapbox-gl-geocoder' {
  import { Map } from 'mapbox-gl';

  export interface MapboxGeocoderOptions {
    accessToken: string;
    countries?: string;
    types?: string;
    proximity?: { longitude: number; latitude: number };
    bbox?: [number, number, number, number];
    limit?: number;
    language?: string;
    placeholder?: string;
    zoom?: number;
    flyTo?: boolean;
    marker?: boolean;
    mapboxgl?: typeof Map;
  }

  export default class MapboxGeocoder {
    constructor(options: MapboxGeocoderOptions);
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
    getContainer(): HTMLElement;
    query(searchInput: string): void;
    clear(): void;
    on(event: string, callback: (e: any) => void): void;
    off(event: string, callback?: (e: any) => void): void;
  }
}

