import type { EventRecord } from '@/lib/types/events';
import { reverseGeoLookup } from '@/lib/data/gazetteer';

// Group events by nearest named location from gazetteer
export function groupByLocation(events: EventRecord[]): Map<string, EventRecord[]> {
  const groups = new Map<string, EventRecord[]>();

  for (const event of events) {
    const [lng, lat] = event.coordinates;
    if (lng === 0 && lat === 0) {
      const key = 'Unlocated';
      groups.set(key, [...(groups.get(key) || []), event]);
      continue;
    }

    // Check rawData.locationName first (Telegram events via gazetteer)
    const rawLocation = (event.rawData as Record<string, unknown>)?.locationName as string | undefined;
    const location = rawLocation || reverseGeoLookup(lat, lng) || 'Other areas';

    groups.set(location, [...(groups.get(location) || []), event]);
  }

  return groups;
}

// Count events by faction/side
export function aggregateFactions(events: EventRecord[]): { friendly: number; hostile: number; unknown: number } {
  const result = { friendly: 0, hostile: 0, unknown: 0 };

  for (const event of events) {
    const side = (event.rawData as Record<string, unknown>)?.side as string | undefined;
    if (side === 'friendly') result.friendly++;
    else if (side === 'hostile') result.hostile++;
    else result.unknown++;
  }

  return result;
}

// Aggregate confirmed equipment losses by type
export function aggregateEquipmentLosses(events: EventRecord[]): Map<string, number> {
  const losses = new Map<string, number>();

  for (const event of events) {
    const destroyed = (event.rawData as Record<string, unknown>)?.destroyed;
    if (!destroyed) continue;

    // Clean up the type name: "Tank destroyed" → "Tank"
    const typeName = event.eventType
      .replace(/\s*destroyed$/i, '')
      .replace(/\s*\[.*\]$/, '')
      .trim();

    if (typeName) {
      losses.set(typeName, (losses.get(typeName) || 0) + 1);
    }
  }

  return losses;
}

// Identify temporal clusters of activity
export interface TimeCluster {
  location: string;
  count: number;
  startTime: string;
  endTime: string;
  types: string[];
}

export function clusterByTime(events: EventRecord[], windowHours: number = 2): TimeCluster[] {
  const locationGroups = groupByLocation(events);
  const clusters: TimeCluster[] = [];
  const windowMs = windowHours * 60 * 60 * 1000;

  for (const [location, locEvents] of locationGroups) {
    if (location === 'Unlocated' || locEvents.length < 3) continue;

    // Sort by timestamp
    const sorted = [...locEvents].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let clusterStart = 0;
    for (let i = 1; i <= sorted.length; i++) {
      const gapExceeded = i === sorted.length ||
        new Date(sorted[i].timestamp).getTime() - new Date(sorted[i - 1].timestamp).getTime() > windowMs;

      if (gapExceeded) {
        const clusterEvents = sorted.slice(clusterStart, i);
        if (clusterEvents.length >= 3) {
          const types = [...new Set(clusterEvents.map(e => e.eventType))];
          clusters.push({
            location,
            count: clusterEvents.length,
            startTime: clusterEvents[0].timestamp,
            endTime: clusterEvents[clusterEvents.length - 1].timestamp,
            types,
          });
        }
        clusterStart = i;
      }
    }
  }

  // Sort clusters by size descending
  clusters.sort((a, b) => b.count - a.count);
  return clusters.slice(0, 5);
}

// Pick top event descriptions by severity and recency
export interface IntelItem {
  timestamp: string;
  description: string;
  source: string;
  severity: string;
}

export function pickTopDescriptions(events: EventRecord[], maxCount: number = 5, maxChars: number = 150): IntelItem[] {
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

  const withDescription = events.filter(e => e.description && e.source !== 'telegram');

  const sorted = [...withDescription].sort((a, b) => {
    const sa = severityOrder[a.severity as keyof typeof severityOrder] ?? 4;
    const sb = severityOrder[b.severity as keyof typeof severityOrder] ?? 4;
    if (sa !== sb) return sa - sb;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return sorted.slice(0, maxCount).map(e => ({
    timestamp: e.timestamp.substring(11, 16) + 'Z',
    description: e.description.length > maxChars ? e.description.substring(0, maxChars) + '...' : e.description,
    source: 'GeoConfirmed, verified',
    severity: e.severity.toUpperCase(),
  }));
}

// Pick top Telegram excerpts with channel attribution
export interface TelegramExcerpt {
  channel: string;
  text: string;
  timestamp: string;
}

export function pickTelegramExcerpts(events: EventRecord[], maxCount: number = 3, maxChars: number = 200): TelegramExcerpt[] {
  const telegramEvents = events.filter(e => e.source === 'telegram');

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  const sorted = [...telegramEvents].sort((a, b) => {
    const sa = severityOrder[a.severity as keyof typeof severityOrder] ?? 4;
    const sb = severityOrder[b.severity as keyof typeof severityOrder] ?? 4;
    if (sa !== sb) return sa - sb;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return sorted.slice(0, maxCount).map(e => {
    const raw = e.rawData as Record<string, unknown>;
    const channel = (raw?.channel as string) || 'unknown';
    const text = e.description.length > maxChars ? e.description.substring(0, maxChars) + '...' : e.description;
    return { channel, text, timestamp: e.timestamp.substring(11, 16) + 'Z' };
  });
}
