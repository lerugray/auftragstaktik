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
  timelineDaysBack?: number; // 0 = show all
  historicalYearFilter?: { startYear: number; endYear: number } | null;
  onFatalityUpdate?: (total: number) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ff2020',
  high: '#ff6b2b',
  medium: '#ffbf00',
  low: '#00cc33',
  info: '#00aaff',
};

// Color gradient for historical year progression (cool to warm)
function getYearColor(year: number, minYear: number, maxYear: number): string {
  const range = maxYear - minYear;
  if (range <= 0) return '#ff4444';
  const t = (year - minYear) / range; // 0..1
  // Blue -> Cyan -> Yellow -> Orange -> Red
  if (t < 0.25) {
    const s = t / 0.25;
    const r = Math.round(0 + s * 0);
    const g = Math.round(120 + s * 135);
    const b = Math.round(255 - s * 55);
    return `rgb(${r},${g},${b})`;
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    const r = Math.round(0 + s * 220);
    const g = Math.round(255 - s * 55);
    const b = Math.round(200 - s * 200);
    return `rgb(${r},${g},${b})`;
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    const r = Math.round(220 + s * 35);
    const g = Math.round(200 - s * 80);
    const b = Math.round(0);
    return `rgb(${r},${g},${b})`;
  } else {
    const s = (t - 0.75) / 0.25;
    const r = Math.round(255);
    const g = Math.round(120 - s * 90);
    const b = Math.round(0 + s * 20);
    return `rgb(${r},${g},${b})`;
  }
}

// Marker size based on fatalities
function getMarkerSize(fatalities: number): number {
  if (fatalities >= 50) return 14;
  if (fatalities >= 10) return 10;
  if (fatalities >= 3) return 7;
  return 5;
}

// Create colored diamond SVG for historical events
function createHistoricalMarkerSvg(color: string, size: number): string {
  const svgSize = size * 2 + 4;
  const center = svgSize / 2;
  const r = size;
  return `<svg width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}" xmlns="http://www.w3.org/2000/svg">
    <polygon points="${center},${center - r} ${center + r},${center} ${center},${center + r} ${center - r},${center}" fill="${color}66" stroke="${color}" stroke-width="1.5"/>
    <circle cx="${center}" cy="${center}" r="${Math.max(1.5, size / 3)}" fill="${color}"/>
  </svg>`;
}

interface HistoricalMarkerEntry {
  marker: maplibregl.Marker;
  eventType: string;
  timestamp?: string;
  year: number;
  fatalities: number;
  element: HTMLDivElement;
}

interface LiveMarkerEntry {
  marker: maplibregl.Marker;
  eventType: string;
  timestamp?: string;
}

export function ConflictEventLayer({ map, theater, onEventClick, activeEventTypes, highlightedEventId, onHighlightClear, timelineDaysBack = 0, historicalYearFilter, onFatalityUpdate }: ConflictEventLayerProps) {
  const liveMarkersRef = useRef<Map<string, LiveMarkerEntry>>(new Map());
  const historicalMarkersRef = useRef<Map<string, HistoricalMarkerEntry>>(new Map());
  const historicalEventsRef = useRef<EventRecord[]>([]);
  const historicalFetchedRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHistorical = !!theater.historical;

  // ── Live mode fetch (unchanged) ─────────────────────────────────────
  const fetchLive = useCallback(async () => {
    const geoconSource = theater.dataSources.find((ds) => ds.source === 'geoconfirmed' && ds.enabled);
    if (!geoconSource) return;

    const conflicts = (geoconSource.params?.conflicts as string[]) || ['ukraine'];
    const conflictsStr = conflicts.join(',');
    const url = `/api/events?conflicts=${encodeURIComponent(conflictsStr)}`;

    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const events: EventRecord[] = data.events || [];

      const currentIds = new Set<string>();

      for (const event of events) {
        currentIds.add(event.id);
        if (liveMarkersRef.current.has(event.id)) continue;
        if (!event.coordinates[0] || !event.coordinates[1]) continue;

        const rawData = event.rawData as Record<string, unknown>;
        const side = (rawData?.side as string) || undefined;
        const sidcMapping = getEventSIDC(event.eventType, side);

        let svgContent: string;
        try {
          svgContent = createEventSymbolSvg(sidcMapping.sidc, 18);
        } catch {
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

        liveMarkersRef.current.set(event.id, { marker, eventType: event.eventType, timestamp: event.timestamp });
      }

      for (const [id, entry] of liveMarkersRef.current) {
        if (!currentIds.has(id)) {
          entry.marker.remove();
          liveMarkersRef.current.delete(id);
        }
      }
    } catch (err) {
      console.error('Conflict event layer error:', err);
    }
  }, [map, theater, onEventClick]);

  // ── Historical mode: fetch ALL events once, render all markers ──────
  const fetchHistorical = useCallback(async () => {
    if (!theater.historical) return;

    const cacheKey = `${theater.id}-${theater.historical.startYear}-${theater.historical.endYear}`;
    if (historicalFetchedRef.current === cacheKey) return; // already fetched

    const countries = theater.historical.countries.join(',');
    const url = `/api/historical?countries=${encodeURIComponent(countries)}&startYear=${theater.historical.startYear}&endYear=${theater.historical.endYear}`;

    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const events: EventRecord[] = data.events || [];

      historicalEventsRef.current = events;
      historicalFetchedRef.current = cacheKey;

      // Remove old markers
      for (const entry of historicalMarkersRef.current.values()) {
        entry.marker.remove();
      }
      historicalMarkersRef.current.clear();

      const minYear = theater.historical!.startYear;
      const maxYear = theater.historical!.endYear;

      for (const event of events) {
        if (!event.coordinates[0] || !event.coordinates[1]) continue;

        const rawData = event.rawData as Record<string, unknown>;
        const year = (rawData?.year as number) || new Date(event.timestamp).getFullYear();
        const fatalities = (rawData?.best as number) || 0;

        const color = getYearColor(year, minYear, maxYear);
        const size = getMarkerSize(fatalities);
        const svgContent = createHistoricalMarkerSvg(color, size);

        const el = document.createElement('div');
        el.className = 'conflict-event-marker historical-marker';
        el.style.cursor = 'pointer';
        el.style.transition = 'opacity 0.4s ease';
        el.innerHTML = svgContent;
        el.title = `${event.title}\n${event.timestamp.substring(0, 10)}`;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onEventClick?.(event);
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([event.coordinates[0], event.coordinates[1]])
          .addTo(map);

        historicalMarkersRef.current.set(event.id, {
          marker,
          eventType: event.eventType,
          timestamp: event.timestamp,
          year,
          fatalities,
          element: el,
        });
      }
    } catch (err) {
      console.error('Historical event layer error:', err);
    }
  }, [map, theater, onEventClick]);

  // ── Mount / unmount ─────────────────────────────────────────────────
  useEffect(() => {
    if (isHistorical) {
      fetchHistorical();
    } else {
      fetchLive();
      intervalRef.current = setInterval(fetchLive, 60000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      for (const entry of liveMarkersRef.current.values()) {
        entry.marker.remove();
      }
      liveMarkersRef.current.clear();
      for (const entry of historicalMarkersRef.current.values()) {
        entry.marker.remove();
      }
      historicalMarkersRef.current.clear();
      historicalFetchedRef.current = null;
    };
  }, [fetchHistorical, fetchLive, isHistorical]);

  // ── Historical: update marker visibility/opacity on year filter change ──
  useEffect(() => {
    if (!isHistorical || !theater.historical) return;

    const fullStart = theater.historical.startYear;
    const fullEnd = theater.historical.endYear;
    const filterStart = historicalYearFilter?.startYear ?? fullStart;
    const filterEnd = historicalYearFilter?.endYear ?? fullEnd;
    const isAllSelected = filterStart === fullStart && filterEnd === fullEnd;

    let totalFatalities = 0;

    for (const [, entry] of historicalMarkersRef.current) {
      const visible = !activeEventTypes || activeEventTypes.has(entry.eventType);

      if (visible) {
        if (isAllSelected) {
          // ALL mode: everything visible at full opacity
          entry.element.style.opacity = '1';
          entry.element.style.display = '';
          totalFatalities += entry.fatalities;
        } else if (entry.year <= filterEnd && entry.year >= fullStart) {
          if (entry.year >= filterStart && entry.year <= filterEnd) {
            // Current selected year(s): full opacity
            entry.element.style.opacity = '1';
            entry.element.style.display = '';
            totalFatalities += entry.fatalities;
          } else if (entry.year < filterStart) {
            // Previous years: faded — shows where conflict has been
            entry.element.style.opacity = '0.3';
            entry.element.style.display = '';
            totalFatalities += entry.fatalities;
          } else {
            // Future years: hidden
            entry.element.style.display = 'none';
          }
        } else {
          entry.element.style.display = 'none';
        }
      } else {
        entry.element.style.display = 'none';
      }
    }

    onFatalityUpdate?.(totalFatalities);
  }, [historicalYearFilter, activeEventTypes, isHistorical, theater.historical, onFatalityUpdate]);

  // ── Live mode: toggle visibility based on event types + timeline ────
  useEffect(() => {
    if (isHistorical) return;

    const cutoff = timelineDaysBack > 0
      ? Date.now() - (timelineDaysBack * 24 * 60 * 60 * 1000)
      : 0;

    for (const [, entry] of liveMarkersRef.current) {
      let visible = !activeEventTypes || activeEventTypes.has(entry.eventType);

      if (visible && cutoff > 0 && entry.timestamp) {
        visible = new Date(entry.timestamp).getTime() >= cutoff;
      }

      const el = entry.marker.getElement();
      if (el) {
        el.style.display = visible ? '' : 'none';
      }
    }
  }, [activeEventTypes, timelineDaysBack, isHistorical]);

  // Highlight (pulse) a specific marker when clicked from the feed
  useEffect(() => {
    if (!highlightedEventId) return;

    const markersMap = isHistorical ? historicalMarkersRef.current : liveMarkersRef.current;
    const entry = markersMap.get(highlightedEventId);
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
  }, [highlightedEventId, onHighlightClear, isHistorical]);

  return null;
}
