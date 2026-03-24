'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { Theater } from '@/lib/theaters';

interface HeatmapLayerProps {
  map: MaplibreMap;
  theater: Theater;
}

const SOURCE_ID = 'heatmap-events';
const LAYER_ID = 'heatmap-layer';

export function HeatmapLayer({ map, theater }: HeatmapLayerProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAndRender = useCallback(async () => {
    const geoconSource = theater.dataSources.find((ds) => ds.source === 'geoconfirmed' && ds.enabled);
    if (!geoconSource) return;

    const conflicts = (geoconSource.params?.conflicts as string[]) || ['ukraine'];
    const conflictsStr = conflicts.join(',');

    try {
      const res = await fetch(`/api/events?conflicts=${encodeURIComponent(conflictsStr)}`);
      if (!res.ok) return;
      const data = await res.json();
      const events = data.events || [];

      // Build GeoJSON from events with valid coordinates
      const features = events
        .filter((e: { coordinates: number[] }) => e.coordinates[0] !== 0 && e.coordinates[1] !== 0)
        .map((e: { coordinates: number[]; severity: string }) => ({
          type: 'Feature' as const,
          properties: {
            weight: e.severity === 'critical' ? 1.0 : e.severity === 'high' ? 0.7 : e.severity === 'medium' ? 0.4 : 0.2,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [e.coordinates[0], e.coordinates[1]],
          },
        }));

      const geojson = { type: 'FeatureCollection' as const, features };

      // Update or add source
      const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(geojson);
      } else {
        map.addSource(SOURCE_ID, { type: 'geojson', data: geojson });

        map.addLayer({
          id: LAYER_ID,
          type: 'heatmap',
          source: SOURCE_ID,
          paint: {
            'heatmap-weight': ['get', 'weight'],
            'heatmap-intensity': [
              'interpolate', ['linear'], ['zoom'],
              4, 0.5,
              7, 1.5,
              10, 3,
            ],
            'heatmap-radius': [
              'interpolate', ['linear'], ['zoom'],
              4, 15,
              7, 25,
              10, 40,
            ],
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(0,0,0,0)',
              0.1, 'rgba(0,0,255,0.3)',
              0.3, 'rgba(0,255,255,0.4)',
              0.5, 'rgba(0,255,0,0.5)',
              0.7, 'rgba(255,255,0,0.6)',
              0.9, 'rgba(255,128,0,0.8)',
              1.0, 'rgba(255,0,0,0.9)',
            ],
            'heatmap-opacity': 0.7,
          },
        });
      }
    } catch (err) {
      console.error('Heatmap layer error:', err);
    }
  }, [map, theater]);

  useEffect(() => {
    fetchAndRender();
    intervalRef.current = setInterval(fetchAndRender, 60000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      try {
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch { /* ignore */ }
    };
  }, [fetchAndRender]);

  return null;
}
