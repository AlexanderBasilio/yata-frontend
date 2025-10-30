import { Injectable } from '@angular/core';
import mapboxgl from 'mapbox-gl';
import { environment } from '../../../../environments/environment';

export interface LocationResult {
  address: string;
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MapboxService {
  constructor() {
    (mapboxgl as any).accessToken = environment.mapbox.accessToken;
  }

  createMap(container: string, center: [number, number], zoom: number): mapboxgl.Map {
    return new mapboxgl.Map({
      container,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom
    });
  }

  async searchAddress(query: string): Promise<any[]> {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${environment.mapbox.accessToken}&country=PE&limit=5&proximity=-75.2,-12.0`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      return data.features || [];
    } catch (error) {
      console.error('Error buscando dirección:', error);
      return [];
    }
  }

  async reverseGeocode(lng: number, lat: number): Promise<LocationResult | null> {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${environment.mapbox.accessToken}&country=PE`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];

        return {
          address: feature.place_name,
          latitude: lat,
          longitude: lng,
          city: this.extractContext(feature, 'place'),
          region: this.extractContext(feature, 'region')
        };
      }

      return null;
    } catch (error) {
      console.error('Error en reverse geocoding:', error);
      return null;
    }
  }

  private extractContext(feature: any, type: string): string | undefined {
    if (!feature.context) return undefined;
    const ctx = feature.context.find((c: any) => c.id.startsWith(type));
    return ctx?.text;
  }

  isLocationInHuancayo(lat: number, lng: number): boolean {
    // Límites aproximados de Huancayo
    const bounds = {
      north: -12.0,
      south: -12.1,
      east: -75.1,
      west: -75.3
    };

    return lat >= bounds.south && lat <= bounds.north &&
           lng >= bounds.west && lng <= bounds.east;
  }
}
