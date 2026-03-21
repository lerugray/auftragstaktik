'use client';

import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { Theater } from '@/lib/theaters';
import type { MaritimeRecord } from '@/lib/types/events';

interface MaritimeLayerProps {
  map: MaplibreMap;
  theater: Theater;
  onVesselClick?: (vessel: MaritimeRecord) => void;
}

const CLASSIFICATION_COLORS: Record<string, string> = {
  military: '#ff4444',
  'law-enforcement': '#ff6b2b',
  'coast-guard': '#ff6b2b',
  auxiliary: '#ffbf00',
  merchant: '#4488cc',
  fishing: '#22aa66',
  unknown: '#888888',
};

function createVesselSvg(classification: string, size: number = 20): string {
  const color = CLASSIFICATION_COLORS[classification] || '#888888';
  const isMilitary = ['military', 'law-enforcement', 'coast-guard'].includes(classification);

  if (isMilitary) {
    // Diamond shape for military/naval
    return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <polygon points="10,2 18,10 10,18 2,10" fill="${color}33" stroke="${color}" stroke-width="2"/>
      <circle cx="10" cy="10" r="2" fill="${color}"/>
    </svg>`;
  }

  // Circle for civilian
  return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="7" fill="${color}33" stroke="${color}" stroke-width="1.5"/>
    <circle cx="10" cy="10" r="2" fill="${color}"/>
  </svg>`;
}

export function MaritimeLayer({ map, theater, onVesselClick }: MaritimeLayerProps) {
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAndRender = useCallback(async () => {
    const aisSource = theater.dataSources.find((ds) => ds.source === 'aisstream' && ds.enabled);
    if (!aisSource) return;

    const bbox = (aisSource.params?.bbox as number[]) || theater.bounds;
    const boundsStr = bbox.join(',');

    try {
      const res = await fetch(`/api/maritime?bounds=${boundsStr}`);
      if (!res.ok) return;
      const data = await res.json();
      const vessels: MaritimeRecord[] = data.vessels || [];

      const currentMMSIs = new Set<string>();

      for (const vessel of vessels) {
        currentMMSIs.add(vessel.mmsi);

        const existing = markersRef.current.get(vessel.mmsi);
        if (existing) {
          existing.setLngLat([vessel.longitude, vessel.latitude]);
        } else {
          const el = document.createElement('div');
          el.className = 'vessel-marker';
          el.style.cursor = 'pointer';
          el.innerHTML = createVesselSvg(vessel.classification);

          el.title = [
            vessel.name || vessel.mmsi,
            vessel.classification.toUpperCase(),
            vessel.speed > 0 ? `${vessel.speed.toFixed(1)}kts` : 'STOPPED',
            vessel.destination || '',
          ].filter(Boolean).join(' | ');

          el.addEventListener('click', (e) => {
            e.stopPropagation();
            onVesselClick?.(vessel);
          });

          const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([vessel.longitude, vessel.latitude])
            .addTo(map);

          markersRef.current.set(vessel.mmsi, marker);
        }
      }

      // Remove stale markers
      for (const [mmsi, marker] of markersRef.current) {
        if (!currentMMSIs.has(mmsi)) {
          marker.remove();
          markersRef.current.delete(mmsi);
        }
      }
    } catch (err) {
      console.error('Maritime layer fetch error:', err);
    }
  }, [map, theater, onVesselClick]);

  useEffect(() => {
    fetchAndRender();
    intervalRef.current = setInterval(fetchAndRender, 30000); // Poll every 30s

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      for (const marker of markersRef.current.values()) {
        marker.remove();
      }
      markersRef.current.clear();
    };
  }, [fetchAndRender]);

  return null;
}
