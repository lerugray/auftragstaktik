'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { Theater } from '@/lib/theaters';
import { getNuclearFacilitiesForTheater, isNuclearFriendly, type NuclearFacility } from '@/lib/data/nuclearFacilities';
import ms from 'milsymbol';

interface NuclearLayerProps {
  map: MaplibreMap;
  theater: Theater;
  onFacilityClick?: (facility: NuclearFacility) => void;
}

function getNuclearSidc(facility: NuclearFacility): string {
  const friendly = isNuclearFriendly(facility.operator);
  const aff = friendly ? 'F' : 'H';
  // CBRN / NBC facility symbol
  return `S${aff}GPIB-------`;
}

function renderNuclearSymbol(sidc: string, size: number = 22): string {
  try {
    const symbol = new ms.Symbol(sidc, { size, frame: true, fill: true } as Record<string, unknown>);
    return symbol.asSVG();
  } catch {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#ffff0033" stroke="#ffcc00" stroke-width="2"/><text x="12" y="16" text-anchor="middle" font-size="12" fill="#ffcc00">☢</text></svg>`;
  }
}

// Generate a GeoJSON circle polygon for exclusion zone
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

const ZONE_SOURCE = 'nuclear-exclusion-zones';
const ZONE_FILL = 'nuclear-zone-fill';
const ZONE_LINE = 'nuclear-zone-line';

const FACILITY_TYPE_LABELS: Record<string, string> = {
  'reactor': 'REACTOR',
  'enrichment': 'ENRICHMENT',
  'weapons-storage': 'WEAPONS',
  'research': 'RESEARCH',
  'waste': 'WASTE',
  'test-site': 'TEST SITE',
};

export function NuclearLayer({ map, theater, onFacilityClick }: NuclearLayerProps) {
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  useEffect(() => {
    const sites = getNuclearFacilitiesForTheater(theater.id);

    // Clear existing markers
    for (const marker of markersRef.current.values()) {
      marker.remove();
    }
    markersRef.current.clear();

    // Clear existing exclusion zone layers/source
    try {
      if (map.getLayer(ZONE_FILL)) map.removeLayer(ZONE_FILL);
      if (map.getLayer(ZONE_LINE)) map.removeLayer(ZONE_LINE);
      if (map.getSource(ZONE_SOURCE)) map.removeSource(ZONE_SOURCE);
    } catch { /* ignore */ }

    if (sites.length === 0) return;

    // Build exclusion zone GeoJSON
    const zoneFeatures: GeoJSON.Feature[] = [];
    for (const site of sites) {
      if (site.exclusionZoneKm && site.exclusionZoneKm > 0) {
        const circle = createCircleGeoJSON(site.lng, site.lat, site.exclusionZoneKm);
        circle.properties = {
          id: site.id,
          name: site.name,
        };
        zoneFeatures.push(circle);
      }
    }

    // Add exclusion zones — yellow/amber color scheme (nuclear warning)
    if (zoneFeatures.length > 0) {
      map.addSource(ZONE_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: zoneFeatures },
      });

      map.addLayer({
        id: ZONE_FILL,
        type: 'fill',
        source: ZONE_SOURCE,
        paint: {
          'fill-color': 'rgba(255, 204, 0, 0.06)',
          'fill-opacity': 1,
        },
      });

      map.addLayer({
        id: ZONE_LINE,
        type: 'line',
        source: ZONE_SOURCE,
        paint: {
          'line-color': 'rgba(255, 204, 0, 0.4)',
          'line-width': 1.5,
          'line-dasharray': [4, 3],
        },
      });
    }

    // Add marker icons
    for (const site of sites) {
      const sidc = getNuclearSidc(site);
      const svgContent = renderNuclearSymbol(sidc, 22);
      const typeLabel = FACILITY_TYPE_LABELS[site.facilityType] || site.facilityType.toUpperCase();

      const el = document.createElement('div');
      el.className = 'nuclear-marker';
      el.style.cursor = 'pointer';
      el.innerHTML = svgContent;
      el.title = `☢ ${typeLabel}: ${site.name}\n${site.operator}\nStatus: ${site.status}${site.exclusionZoneKm ? `\nExclusion: ${site.exclusionZoneKm}km` : ''}`;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onFacilityClick?.(site);
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
        if (map.getLayer(ZONE_FILL)) map.removeLayer(ZONE_FILL);
        if (map.getLayer(ZONE_LINE)) map.removeLayer(ZONE_LINE);
        if (map.getSource(ZONE_SOURCE)) map.removeSource(ZONE_SOURCE);
      } catch { /* ignore */ }
    };
  }, [map, theater.id, onFacilityClick]);

  return null;
}
