'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { Theater } from '@/lib/theaters';
import type { AircraftRecord } from '@/lib/types/events';
import { createAircraftSymbolSvg } from '@/lib/symbols/milsymbolFactory';

interface AircraftLayerProps {
  map: MaplibreMap;
  theater: Theater;
  onAircraftClick?: (aircraft: AircraftRecord) => void;
}

export function AircraftLayer({ map, theater, onAircraftClick }: AircraftLayerProps) {
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [aircraftCount, setAircraftCount] = useState(0);

  const fetchAndRender = useCallback(async () => {
    const adsbSource = theater.dataSources.find((ds) => ds.source === 'adsb' && ds.enabled);
    if (!adsbSource) return;

    const bbox = (adsbSource.params?.bbox as number[]) || theater.bounds;
    const boundsStr = bbox.join(',');

    try {
      const res = await fetch(`/api/aircraft?bounds=${boundsStr}`);
      if (!res.ok) return;
      const data = await res.json();
      const aircraft: AircraftRecord[] = data.aircraft || [];

      setAircraftCount(aircraft.length);

      const currentHexes = new Set<string>();

      for (const ac of aircraft) {
        // Skip stationary ground transponders (towers, ground stations)
        if (ac.onGround && ac.speed === 0 && ac.altitude <= 0) continue;

        currentHexes.add(ac.icao);

        const existing = markersRef.current.get(ac.icao);
        if (existing) {
          // Update position of existing marker
          existing.setLngLat([ac.longitude, ac.latitude]);
          // Update rotation
          const el = existing.getElement();
          if (el) {
            el.style.transform = `${el.style.transform.replace(/rotate\([^)]+\)/, '')} rotate(${ac.heading || 0}deg)`;
          }
        } else {
          // Create new marker
          const el = document.createElement('div');
          el.className = 'aircraft-marker';
          el.style.cursor = 'pointer';
          el.innerHTML = createAircraftSymbolSvg(
            { military: ac.military, onGround: ac.onGround, heading: ac.heading },
            ac.military ? 28 : 22
          );

          // Tooltip
          el.title = [
            ac.callsign || ac.icao,
            ac.aircraftType || '',
            ac.military ? '(MIL)' : '',
            `${ac.altitude}ft`,
            `${ac.speed}kts`,
          ].filter(Boolean).join(' | ');

          el.addEventListener('click', (e) => {
            e.stopPropagation();
            onAircraftClick?.(ac);
          });

          const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([ac.longitude, ac.latitude])
            .addTo(map);

          markersRef.current.set(ac.icao, marker);
        }
      }

      // Remove markers for aircraft no longer present
      for (const [hex, marker] of markersRef.current) {
        if (!currentHexes.has(hex)) {
          marker.remove();
          markersRef.current.delete(hex);
        }
      }
    } catch (err) {
      console.error('Aircraft layer fetch error:', err);
    }
  }, [map, theater, onAircraftClick]);

  useEffect(() => {
    fetchAndRender();
    intervalRef.current = setInterval(fetchAndRender, 10000); // Poll every 10s

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Clean up all markers
      for (const marker of markersRef.current.values()) {
        marker.remove();
      }
      markersRef.current.clear();
    };
  }, [fetchAndRender]);

  // Return count for status indicator (not rendered visually)
  useEffect(() => {
    // Expose count via custom event for status bar
    window.dispatchEvent(new CustomEvent('aircraft-count', { detail: aircraftCount }));
  }, [aircraftCount]);

  return null;
}
