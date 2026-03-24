'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { Theater } from '@/lib/theaters';
import { getRadarSitesForTheater, isRadarFriendly, type RadarInstallation } from '@/lib/data/radarSites';
import ms from 'milsymbol';

interface RadarLayerProps {
  map: MaplibreMap;
  theater: Theater;
  onRadarClick?: (radar: RadarInstallation) => void;
}

function getRadarSidc(radar: RadarInstallation): string {
  const friendly = isRadarFriendly(radar.operator);
  const aff = friendly ? 'F' : 'H';
  // Ground sensor/radar SIDC
  return `S${aff}GPUSR------`;
}

function renderRadarSymbol(sidc: string, size: number = 22): string {
  try {
    const symbol = new ms.Symbol(sidc, { size, frame: true, fill: true } as Record<string, unknown>);
    return symbol.asSVG();
  } catch {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><polygon points="12,2 22,12 12,22 2,12" fill="#9933ff33" stroke="#9933ff" stroke-width="2"/></svg>`;
  }
}

// Generate a GeoJSON circle polygon for a given center and radius
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

const DETECTION_SOURCE = 'radar-detection-rings';
const DETECTION_FILL = 'radar-detection-fill';
const DETECTION_LINE = 'radar-detection-line';
const TRACKING_SOURCE = 'radar-tracking-rings';
const TRACKING_FILL = 'radar-tracking-fill';
const TRACKING_LINE = 'radar-tracking-line';

export function RadarLayer({ map, theater, onRadarClick }: RadarLayerProps) {
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  useEffect(() => {
    const sites = getRadarSitesForTheater(theater.id);

    // Clear existing markers
    for (const marker of markersRef.current.values()) {
      marker.remove();
    }
    markersRef.current.clear();

    // Clear existing range ring layers/sources
    const layersToRemove = [DETECTION_FILL, DETECTION_LINE, TRACKING_FILL, TRACKING_LINE];
    const sourcesToRemove = [DETECTION_SOURCE, TRACKING_SOURCE];
    try {
      for (const layer of layersToRemove) {
        if (map.getLayer(layer)) map.removeLayer(layer);
      }
      for (const source of sourcesToRemove) {
        if (map.getSource(source)) map.removeSource(source);
      }
    } catch { /* ignore */ }

    if (sites.length === 0) return;

    // Build detection range ring GeoJSON
    const detectionFeatures: GeoJSON.Feature[] = [];
    const trackingFeatures: GeoJSON.Feature[] = [];

    for (const site of sites) {
      const friendly = isRadarFriendly(site.operator);

      if (site.detectionRangeKm > 0) {
        const circle = createCircleGeoJSON(site.lng, site.lat, site.detectionRangeKm);
        circle.properties = { id: site.id, system: site.system, friendly };
        detectionFeatures.push(circle);
      }

      // Add inner tracking ring if different from detection
      if (site.trackingRangeKm && site.trackingRangeKm !== site.detectionRangeKm) {
        const circle = createCircleGeoJSON(site.lng, site.lat, site.trackingRangeKm);
        circle.properties = { id: site.id, system: site.system, friendly };
        trackingFeatures.push(circle);
      }
    }

    // Detection rings (outer, fainter) — purple/violet color scheme
    if (detectionFeatures.length > 0) {
      map.addSource(DETECTION_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: detectionFeatures },
      });

      map.addLayer({
        id: DETECTION_FILL,
        type: 'fill',
        source: DETECTION_SOURCE,
        paint: {
          'fill-color': [
            'case',
            ['get', 'friendly'], 'rgba(100, 60, 255, 0.03)',
            'rgba(180, 50, 220, 0.03)',
          ],
          'fill-opacity': 1,
        },
      });

      map.addLayer({
        id: DETECTION_LINE,
        type: 'line',
        source: DETECTION_SOURCE,
        paint: {
          'line-color': [
            'case',
            ['get', 'friendly'], 'rgba(100, 60, 255, 0.25)',
            'rgba(180, 50, 220, 0.25)',
          ],
          'line-width': 1,
          'line-dasharray': [6, 4],
        },
      });
    }

    // Tracking rings (inner, brighter)
    if (trackingFeatures.length > 0) {
      map.addSource(TRACKING_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: trackingFeatures },
      });

      map.addLayer({
        id: TRACKING_FILL,
        type: 'fill',
        source: TRACKING_SOURCE,
        paint: {
          'fill-color': [
            'case',
            ['get', 'friendly'], 'rgba(100, 60, 255, 0.06)',
            'rgba(180, 50, 220, 0.06)',
          ],
          'fill-opacity': 1,
        },
      });

      map.addLayer({
        id: TRACKING_LINE,
        type: 'line',
        source: TRACKING_SOURCE,
        paint: {
          'line-color': [
            'case',
            ['get', 'friendly'], 'rgba(100, 60, 255, 0.4)',
            'rgba(180, 50, 220, 0.4)',
          ],
          'line-width': 1.5,
          'line-dasharray': [3, 2],
        },
      });
    }

    // Add marker icons
    for (const site of sites) {
      const sidc = getRadarSidc(site);
      const svgContent = renderRadarSymbol(sidc, 22);

      const el = document.createElement('div');
      el.className = 'radar-marker';
      el.style.cursor = 'pointer';
      el.innerHTML = svgContent;
      el.title = `${site.system} (${site.operator})\n${site.location}\nDetection: ${site.detectionRangeKm}km${site.trackingRangeKm ? `\nTracking: ${site.trackingRangeKm}km` : ''}\nStatus: ${site.status}`;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onRadarClick?.(site);
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
        for (const layer of layersToRemove) {
          if (map.getLayer(layer)) map.removeLayer(layer);
        }
        for (const source of sourcesToRemove) {
          if (map.getSource(source)) map.removeSource(source);
        }
      } catch { /* ignore */ }
    };
  }, [map, theater.id, onRadarClick]);

  return null;
}
