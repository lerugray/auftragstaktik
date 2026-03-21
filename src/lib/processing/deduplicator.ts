import type { EventRecord } from '@/lib/types/events';

const DISTANCE_THRESHOLD_KM = 5;
const TIME_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function deduplicateEvents(events: EventRecord[]): EventRecord[] {
  const kept: EventRecord[] = [];

  for (const event of events) {
    const isDuplicate = kept.some((existing) => {
      // Same source events are never deduped against each other (they have unique IDs)
      if (existing.source === event.source) return false;

      // Check spatial proximity
      const dist = haversineKm(
        event.coordinates[1], event.coordinates[0],
        existing.coordinates[1], existing.coordinates[0]
      );
      if (dist > DISTANCE_THRESHOLD_KM) return false;

      // Check temporal proximity
      const timeDiff = Math.abs(
        new Date(event.timestamp).getTime() - new Date(existing.timestamp).getTime()
      );
      if (timeDiff > TIME_THRESHOLD_MS) return false;

      // Check same event type category
      if (event.eventType !== existing.eventType) return false;

      return true;
    });

    if (!isDuplicate) {
      kept.push(event);
    }
  }

  return kept;
}
