'use client';

import { useEffect } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { Theater } from '@/lib/theaters';

interface FrontlineLayerProps {
  map: MaplibreMap;
  theater: Theater;
}

const SOURCE_ID = 'deepstate-frontlines';
const TERRITORY_FILL = 'frontline-territory-fill';
const TERRITORY_LINE = 'frontline-territory-line';
const UNIT_FILL = 'frontline-unit-fill';
const UNIT_LINE = 'frontline-unit-line';

const ALL_LAYERS = [UNIT_LINE, UNIT_FILL, TERRITORY_LINE, TERRITORY_FILL];

export function FrontlineLayer({ map, theater }: FrontlineLayerProps) {
  useEffect(() => {
    const hasDeepState = theater.dataSources.some(
      (ds) => ds.source === 'deepstate' && ds.enabled
    );
    if (!hasDeepState) {
      cleanup(map);
      return;
    }

    let cancelled = false;

    async function loadFrontlines() {
      try {
        const res = await fetch('/api/deepstate');
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const geojson = await res.json();

        if (cancelled) return;

        cleanup(map);

        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: geojson,
        });

        // Territory fill (occupied, contested, transnistria)
        map.addLayer({
          id: TERRITORY_FILL,
          type: 'fill',
          source: SOURCE_ID,
          filter: ['in', ['get', 'status'], ['literal', ['occupied', 'contested', 'transnistria']]],
          paint: {
            'fill-color': [
              'match', ['get', 'status'],
              'occupied', '#a52714',
              'contested', '#bcaaa4',
              'transnistria', '#7b1fa2',
              '#ff6d00',
            ],
            'fill-opacity': 0.25,
          },
        });

        // Territory boundary line
        map.addLayer({
          id: TERRITORY_LINE,
          type: 'line',
          source: SOURCE_ID,
          filter: ['in', ['get', 'status'], ['literal', ['occupied', 'contested', 'transnistria']]],
          paint: {
            'line-color': [
              'match', ['get', 'status'],
              'occupied', '#d93025',
              'contested', '#8d6e63',
              'transnistria', '#9c27b0',
              '#ff9100',
            ],
            'line-width': 2,
            'line-dasharray': [2, 1],
          },
        });

        // Unit deployment zones — visible from zoom 6+
        map.addLayer({
          id: UNIT_FILL,
          type: 'fill',
          source: SOURCE_ID,
          filter: ['==', ['get', 'status'], 'unit'],
          minzoom: 6,
          paint: {
            'fill-color': '#e65100',
            'fill-opacity': [
              'interpolate', ['linear'], ['zoom'],
              6, 0.08,
              8, 0.18,
              10, 0.25,
            ],
          },
        });

        map.addLayer({
          id: UNIT_LINE,
          type: 'line',
          source: SOURCE_ID,
          filter: ['==', ['get', 'status'], 'unit'],
          minzoom: 6,
          paint: {
            'line-color': '#ff9100',
            'line-width': [
              'interpolate', ['linear'], ['zoom'],
              6, 0.5,
              8, 1.5,
              10, 2,
            ],
            'line-opacity': [
              'interpolate', ['linear'], ['zoom'],
              6, 0.3,
              8, 0.6,
              10, 0.8,
            ],
            'line-dasharray': [2, 1],
          },
        });

      } catch (err) {
        console.error('Failed to load frontline data:', err);
      }
    }

    loadFrontlines();

    return () => {
      cancelled = true;
    };
  }, [map, theater.id, theater.dataSources]);

  return null;
}

function cleanup(map: MaplibreMap) {
  try {
    for (const id of ALL_LAYERS) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
  } catch {
    // Ignore cleanup errors
  }
}
