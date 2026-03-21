'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { EventCard } from './EventCard';
import { FeedFilters } from './FeedFilters';
import type { EventRecord, EventSource, Severity } from '@/lib/types/events';

interface IntelFeedProps {
  theaterId: string;
  theaterConflicts: string; // comma-separated GeoConfirmed conflict slugs
  telegramChannels?: string; // comma-separated Telegram channel names
  onEventClick?: (event: EventRecord) => void;
}

const ALL_SOURCES: EventSource[] = ['acled', 'adsb', 'aisstream', 'deepstate', 'telegram'];
const ALL_SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

export function IntelFeed({ theaterId, theaterConflicts, telegramChannels, onEventClick }: IntelFeedProps) {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSources, setActiveSources] = useState<EventSource[]>(ALL_SOURCES);
  const [activeSeverities, setActiveSeverities] = useState<Severity[]>(ALL_SEVERITIES);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  const fetchEvents = useCallback(async () => {
    try {
      let url = `/api/events?conflicts=${encodeURIComponent(theaterConflicts)}`;
      if (telegramChannels) url += `&telegram=${encodeURIComponent(telegramChannels)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      setEvents(data.events || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setError('SIGNAL LOST');
    } finally {
      setLoading(false);
    }
  }, [theaterConflicts, telegramChannels]);

  // Initial fetch + polling every 30 seconds
  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  // Re-fetch when theater changes
  useEffect(() => {
    setLoading(true);
    fetchEvents();
  }, [theaterId, fetchEvents]);

  const toggleSource = useCallback((source: EventSource) => {
    setActiveSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  }, []);

  const toggleSeverity = useCallback((severity: Severity) => {
    setActiveSeverities((prev) =>
      prev.includes(severity) ? prev.filter((s) => s !== severity) : [...prev, severity]
    );
  }, []);

  // Filter events
  const filteredEvents = events.filter(
    (e) => activeSources.includes(e.source) && activeSeverities.includes(e.severity)
  );

  const exportData = useCallback((format: 'json' | 'csv') => {
    if (filteredEvents.length === 0) return;

    let content: string;
    let mimeType: string;
    let ext: string;

    if (format === 'json') {
      content = JSON.stringify(filteredEvents, null, 2);
      mimeType = 'application/json';
      ext = 'json';
    } else {
      const headers = ['id', 'source', 'timestamp', 'eventType', 'severity', 'title', 'lat', 'lng'];
      const rows = filteredEvents.map(e =>
        [e.id, e.source, e.timestamp, e.eventType, e.severity, `"${e.title.replace(/"/g, '""')}"`, e.coordinates[1], e.coordinates[0]].join(',')
      );
      content = [headers.join(','), ...rows].join('\n');
      mimeType = 'text/csv';
      ext = 'csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auftragstaktik_events_${new Date().toISOString().substring(0, 10)}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredEvents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-tactical-text-dim">
        <div className="text-center">
          <div className="text-terminal-amber/40 text-3xl mb-3 animate-pulse">&#x25B6;</div>
          <div className="text-base font-mono tracking-wider">ACQUIRING INTEL...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-terminal-red">
        <div className="text-center">
          <div className="text-3xl mb-3">&#x2716;</div>
          <div className="text-base font-mono tracking-wider">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <FeedFilters
        activeSources={activeSources}
        activeSeverities={activeSeverities}
        onToggleSource={toggleSource}
        onToggleSeverity={toggleSeverity}
      />

      {/* Event count + export */}
      <div className="flex items-center justify-between px-3 py-1.5 text-xs font-mono text-tactical-text-dim border-b border-tactical-border bg-tactical-dark/50">
        <span>{filteredEvents.length} EVENTS / {events.length} TOTAL</span>
        <div className="flex gap-2">
          <button
            onClick={() => exportData('json')}
            className="text-terminal-blue hover:text-terminal-blue/80"
          >
            JSON
          </button>
          <button
            onClick={() => exportData('csv')}
            className="text-terminal-blue hover:text-terminal-blue/80"
          >
            CSV
          </button>
        </div>
      </div>

      {/* Scrolling event list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
      >
        {filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-tactical-text-dim">
            <div className="text-sm font-mono">NO EVENTS MATCH FILTERS</div>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} onClick={onEventClick} />
          ))
        )}
      </div>
    </div>
  );
}
