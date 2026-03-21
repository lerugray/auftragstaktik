import type { EventRecord, ACLEDRecord, Severity } from '@/lib/types/events';
import type { GeoConfirmedEvent } from '@/lib/data/geoconfirmed';

function hashId(source: string, ...parts: string[]): string {
  const str = [source, ...parts].join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `${source}-${Math.abs(hash).toString(36)}`;
}

function acledSeverity(record: ACLEDRecord): Severity {
  if (record.fatalities >= 10) return 'critical';
  if (record.fatalities >= 3) return 'high';

  const type = record.eventType.toLowerCase();
  if (type.includes('battle')) return 'high';
  if (type.includes('explosion') || type.includes('remote violence')) {
    return record.fatalities > 0 ? 'high' : 'medium';
  }
  if (type.includes('violence against civilians')) return 'high';
  if (type.includes('strategic')) return 'medium';
  if (type.includes('protest') || type.includes('riot')) return 'low';
  return 'info';
}

function formatACLEDTitle(record: ACLEDRecord): string {
  const location = record.admin1
    ? `${record.location}, ${record.admin1}`
    : record.location;

  let title = `${record.subEventType || record.eventType} — ${location}`;
  if (record.fatalities > 0) {
    title += ` (${record.fatalities} killed)`;
  }
  return title;
}

export function normalizeACLEDEvent(record: ACLEDRecord): EventRecord {
  return {
    id: hashId('acled', record.eventId),
    source: 'acled',
    timestamp: new Date(record.eventDate).toISOString(),
    coordinates: [record.longitude, record.latitude],
    eventType: record.subEventType || record.eventType,
    severity: acledSeverity(record),
    title: formatACLEDTitle(record),
    description: record.notes || '',
    rawData: record as unknown as Record<string, unknown>,
  };
}

export function normalizeACLEDEvents(records: ACLEDRecord[]): EventRecord[] {
  return records.map(normalizeACLEDEvent);
}

// GeoConfirmed normalization

function geoConfirmedSeverity(event: GeoConfirmedEvent): Severity {
  const type = event.eventType.toLowerCase();
  if (type.includes('missile')) return 'critical';
  if (type.includes('drone strike')) return 'high';
  if (type.includes('artillery') || type.includes('shelling')) return 'high';
  if (type.includes('explosion') || type.includes('strike')) return 'high';
  if (type.includes('tank') || type.includes('apc') || type.includes('vehicle')) return 'medium';
  if (event.destroyed) return 'medium';
  return 'info';
}

function formatGeoConfirmedTitle(event: GeoConfirmedEvent): string {
  let title = event.eventType;
  if (event.destroyed) title += ' (destroyed)';
  title += ` [${event.faction}]`;
  return title;
}

export function normalizeGeoConfirmedEvent(event: GeoConfirmedEvent): EventRecord {
  return {
    id: `geoconfirmed-${event.id}`,
    source: 'acled', // Using 'acled' source slot since GeoConfirmed replaces it in the feed
    timestamp: new Date(event.date).toISOString(),
    coordinates: [event.longitude, event.latitude],
    eventType: event.eventType,
    severity: geoConfirmedSeverity(event),
    title: formatGeoConfirmedTitle(event),
    description: `${event.faction} activity. ${event.destroyed ? 'Equipment confirmed destroyed.' : 'Geolocated and verified by GeoConfirmed.'}`,
    rawData: event as unknown as Record<string, unknown>,
  };
}

export function normalizeGeoConfirmedEvents(events: GeoConfirmedEvent[]): EventRecord[] {
  return events.map(normalizeGeoConfirmedEvent);
}
