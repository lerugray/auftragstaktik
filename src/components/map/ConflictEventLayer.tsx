'use client';

import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { Theater } from '@/lib/theaters';
import type { EventRecord } from '@/lib/types/events';
import { getEventSIDC } from '@/lib/symbols/sidcMapper';
import { createEventSymbolSvg } from '@/lib/symbols/milsymbolFactory';

interface ConflictEventLayerProps {
  map: MaplibreMap;
  theater: Theater;
  onEventClick?: (event: EventRecord) => void;
  activeEventTypes?: Set<string>;
  highlightedEventId?: string | null;
  onHighlightClear?: () => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ff2020',
  high: '#ff6b2b',
  medium: '#ffbf00',
  low: '#00cc33',
  info: '#00aaff',
};

export function ConflictEventLayer({ map, theater, onEventClick, activeEventTypes, highlightedEventId, onHighlightClear }: ConflictEventLayerProps) {
  const markersRef = useRef<Map<string, { marker: maplibregl.Marker; eventType: string }>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAndRender = useCallback(async () => {
    const acledSource = theater.dataSources.find((ds) => ds.source === 'acled' && ds.enabled);
    if (!acledSource) return;

    const conflicts = (acledSource.params?.conflicts as string[]) || ['ukraine'];
    const conflictsStr = conflicts.join(',');

    try {
      const res = await fetch(`/api/events?conflicts=${encodeURIComponent(conflictsStr)}`);
      if (!res.ok) return;
      const data = await res.json();
      const events: EventRecord[] = data.events || [];

      const currentIds = new Set<string>();

      for (const event of events) {
        currentIds.add(event.id);

        if (markersRef.current.has(event.id)) {
          continue;
        }

        if (!event.coordinates[0] || !event.coordinates[1]) continue;

        // Get NATO symbol for this event type
        const rawData = event.rawData as Record<string, unknown>;
        const side = (rawData?.side as string) || undefined;
        const sidcMapping = getEventSIDC(event.eventType, side);

        let svgContent: string;
        try {
          svgContent = createEventSymbolSvg(sidcMapping.sidc, 18);
        } catch {
          // Fallback to a simple colored marker if milsymbol fails for this SIDC
          const color = SEVERITY_COLORS[event.severity] || '#ffbf00';
          svgContent = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <polygon points="8,1 15,8 8,15 1,8" fill="${color}44" stroke="${color}" stroke-width="1.5"/>
            <circle cx="8" cy="8" r="2" fill="${color}"/>
          </svg>`;
        }

        const el = document.createElement('div');
        el.className = 'conflict-event-marker';
        el.style.cursor = 'pointer';
        el.innerHTML = svgContent;

        el.title = `${event.title}\n${event.timestamp.substring(0, 10)}`;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onEventClick?.(event);
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([event.coordinates[0], event.coordinates[1]])
          .addTo(map);

        markersRef.current.set(event.id, { marker, eventType: event.eventType });
      }

      // Remove markers for events no longer present
      for (const [id, entry] of markersRef.current) {
        if (!currentIds.has(id)) {
          entry.marker.remove();
          markersRef.current.delete(id);
        }
      }
    } catch (err) {
      console.error('Conflict event layer error:', err);
    }
  }, [map, theater, onEventClick]);

  useEffect(() => {
    fetchAndRender();
    intervalRef.current = setInterval(fetchAndRender, 60000); // Refresh every 60s

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      for (const entry of markersRef.current.values()) {
        entry.marker.remove();
      }
      markersRef.current.clear();
    };
  }, [fetchAndRender]);

  // Toggle marker visibility based on active event type filters
  useEffect(() => {
    for (const entry of markersRef.current.values()) {
      const visible = !activeEventTypes || activeEventTypes.has(entry.eventType);
      const el = entry.marker.getElement();
      if (el) {
        el.style.display = visible ? '' : 'none';
      }
    }
  }, [activeEventTypes]);

  // Highlight (pulse) a specific marker when clicked from the feed
  useEffect(() => {
    if (!highlightedEventId) return;

    const entry = markersRef.current.get(highlightedEventId);
    if (!entry) return;

    const el = entry.marker.getElement();
    if (!el) return;

    el.classList.add('marker-pulse');

    const timeout = setTimeout(() => {
      el.classList.remove('marker-pulse');
      onHighlightClear?.();
    }, 4000);

    return () => {
      clearTimeout(timeout);
      el.classList.remove('marker-pulse');
    };
  }, [highlightedEventId, onHighlightClear]);

  return null;
}
