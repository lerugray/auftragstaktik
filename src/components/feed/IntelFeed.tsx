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

      {/* Event count */}
      <div className="px-3 py-1.5 text-xs font-mono text-tactical-text-dim border-b border-tactical-border bg-tactical-dark/50">
        {filteredEvents.length} EVENTS / {events.length} TOTAL
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
