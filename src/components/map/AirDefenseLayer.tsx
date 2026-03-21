'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { Theater } from '@/lib/theaters';
import { getAirDefenseForTheater, type AirDefenseInstallation } from '@/lib/data/airDefense';
import ms from 'milsymbol';

interface AirDefenseLayerProps {
  map: MaplibreMap;
  theater: Theater;
  onInstallationClick?: (installation: AirDefenseInstallation) => void;
}

function getADSidc(installation: AirDefenseInstallation): string {
  const friendly = ['Ukraine', 'Israel', 'Saudi Arabia'].includes(installation.operator);
  const aff = friendly ? 'F' : 'H';
  return `S${aff}GPUCD----`;
}

function renderADSymbol(sidc: string, size: number = 24): string {
  try {
    const symbol = new ms.Symbol(sidc, { size, frame: true, fill: true } as Record<string, unknown>);
    return symbol.asSVG();
  } catch {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><polygon points="12,2 22,12 12,22 2,12" fill="#ff880033" stroke="#ff8800" stroke-width="2"/></svg>`;
  }
}

// Generate a GeoJSON circle polygon (approximation) for a given center and radius
function createCircleGeoJSON(lng: number, lat: number, radiusKm: number, points: number = 64): GeoJSON.Feature {
  const coords: [number, number][] = [];
  const earthRadiusKm = 6371;

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dLat = (radiusKm / earthRadiusKm) * Math.cos(angle);
    const dLng = (radiusKm / earthRadiusKm) * Math.sin(angle) / Math.cos(lat * Math.PI / 180);
    coords.push([
      lng + dLng * (180 / Math.PI),
      lat + dLat * (180 / Math.PI),
    ]);
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [coords] },
  };
}

const RANGE_SOURCE = 'ad-range-rings';
const RANGE_FILL = 'ad-range-fill';
const RANGE_LINE = 'ad-range-line';

export function AirDefenseLayer({ map, theater, onInstallationClick }: AirDefenseLayerProps) {
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  useEffect(() => {
    const sites = getAirDefenseForTheater(theater.id);

    // Clear existing markers
    for (const marker of markersRef.current.values()) {
      marker.remove();
    }
    markersRef.current.clear();

    // Clear existing range ring layers/source
    try {
      if (map.getLayer(RANGE_FILL)) map.removeLayer(RANGE_FILL);
      if (map.getLayer(RANGE_LINE)) map.removeLayer(RANGE_LINE);
      if (map.getSource(RANGE_SOURCE)) map.removeSource(RANGE_SOURCE);
    } catch { /* ignore */ }

    if (sites.length === 0) return;

    // Build range ring GeoJSON
    const rangeFeatures: GeoJSON.Feature[] = [];
    for (const site of sites) {
      if (site.rangeKm > 0) {
        const circle = createCircleGeoJSON(site.lng, site.lat, site.rangeKm);
        const friendly = ['Ukraine', 'Israel', 'Saudi Arabia'].includes(site.operator);
        circle.properties = {
          id: site.id,
          system: site.system,
          friendly,
        };
        rangeFeatures.push(circle);
      }
    }

    // Add range rings as map source + layers
    if (rangeFeatures.length > 0) {
      map.addSource(RANGE_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: rangeFeatures },
      });

      map.addLayer({
        id: RANGE_FILL,
        type: 'fill',
        source: RANGE_SOURCE,
        paint: {
          'fill-color': [
            'case',
            ['get', 'friendly'], 'rgba(0, 100, 255, 0.06)',
            'rgba(255, 50, 50, 0.06)',
          ],
          'fill-opacity': 1,
        },
      });

      map.addLayer({
        id: RANGE_LINE,
        type: 'line',
        source: RANGE_SOURCE,
        paint: {
          'line-color': [
            'case',
            ['get', 'friendly'], 'rgba(0, 100, 255, 0.35)',
            'rgba(255, 50, 50, 0.35)',
          ],
          'line-width': 1.5,
          'line-dasharray': [4, 3],
        },
      });
    }

    // Add marker icons for each site
    for (const site of sites) {
      const sidc = getADSidc(site);
      const svgContent = renderADSymbol(sidc, 22);

      const el = document.createElement('div');
      el.className = 'ad-marker';
      el.style.cursor = 'pointer';
      el.innerHTML = svgContent;
      el.title = `${site.system} (${site.operator})\n${site.location}\nRange: ${site.rangeKm}km\nStatus: ${site.status}`;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onInstallationClick?.(site);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([site.lng, site.lat])
        .addTo(map);

      markersRef.current.set(site.id, marker);
    }

    return () => {
      for (const marker of markersRef.current.values()) {
        marker.remove();
      }
      markersRef.current.clear();
      try {
        if (map.getLayer(RANGE_FILL)) map.removeLayer(RANGE_FILL);
        if (map.getLayer(RANGE_LINE)) map.removeLayer(RANGE_LINE);
        if (map.getSource(RANGE_SOURCE)) map.removeSource(RANGE_SOURCE);
      } catch { /* ignore */ }
    };
  }, [map, theater.id, onInstallationClick]);

  return null;
}
