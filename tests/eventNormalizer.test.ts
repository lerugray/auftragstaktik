import { describe, expect, it } from 'vitest';
import type { ACLEDRecord } from '@/lib/types/events';
import type { GeoConfirmedEvent } from '@/lib/data/geoconfirmed';
import type { UCDPEvent } from '@/lib/data/ucdpGed';
import {
  normalizeACLEDEvent,
  normalizeACLEDEvents,
  normalizeGeoConfirmedEvent,
  normalizeGeoConfirmedEvents,
  normalizeUCDPEvent,
  normalizeUCDPEvents,
} from '@/lib/processing/eventNormalizer';

function minimalUcdp(overrides: Partial<UCDPEvent> = {}): UCDPEvent {
  return {
    id: 42,
    relid: 'rel-42',
    year: 2020,
    date_start: '2020-06-15',
    date_end: '2020-06-16',
    active_year: true,
    type_of_violence: 1,
    conflict_name: 'Eastern Front',
    dyad_name: 'Side A vs Side B',
    side_a: 'Government forces',
    side_b: 'Opposition',
    country: 'Ukraine',
    region: 'East',
    latitude: 48.5,
    longitude: 38.0,
    geom_wkt: 'POINT(38 48.5)',
    priogrid_gid: 100,
    where_prec: 1,
    date_prec: 1,
    deaths_a: 1,
    deaths_b: 0,
    deaths_civilians: 0,
    deaths_unknown: 0,
    best: 2,
    high: 3,
    low: 1,
    source_article: '',
    source_office: 'UCDP',
    source_date: '2020-07-01',
    source_headline: '',
    source_original: '',
    ...overrides,
  };
}

describe('eventNormalizer', () => {
  describe('ACLED', () => {
    const base: ACLEDRecord = {
      eventId: 'acled-stable-1',
      eventDate: '2024-03-10',
      eventType: 'Protests',
      subEventType: 'Peaceful protest',
      actor1: 'Civilians',
      country: 'Ukraine',
      location: 'Kyiv',
      latitude: 50.45,
      longitude: 30.5233,
      fatalities: 0,
    };

    it('produces stable id for the same record', () => {
      const a = normalizeACLEDEvent(base);
      const b = normalizeACLEDEvent(base);
      expect(a.id).toBe(b.id);
      expect(a.id.startsWith('acled-')).toBe(true);
    });

    it('maps to EventRecord with coordinates and ISO timestamp', () => {
      const out = normalizeACLEDEvent(base);
      expect(out.source).toBe('acled');
      expect(out.coordinates).toEqual([30.5233, 50.45]);
      expect(out.timestamp).toBe(new Date('2024-03-10').toISOString());
    });

    it('handles missing optional notes and empty subEventType without throwing', () => {
      const sparse = {
        eventId: 'sparse-1',
        eventDate: '2024-01-02',
        eventType: 'Strategic developments',
        subEventType: '',
        actor1: 'Actor',
        country: 'UA',
        location: 'Odesa',
        latitude: 46.48,
        longitude: 30.75,
        fatalities: 0,
      } as ACLEDRecord;
      const out = normalizeACLEDEvent(sparse);
      expect(out.eventType).toBe('Strategic developments');
      expect(out.description).toBe('');
      expect(out.title).toContain('Strategic developments');
    });

    it('returns empty array for empty ACLED input', () => {
      expect(normalizeACLEDEvents([])).toEqual([]);
    });
  });

  describe('GeoConfirmed', () => {
    const event: GeoConfirmedEvent = {
      id: 'gc-99',
      date: '2024-05-01T14:30:00Z',
      latitude: 49.2,
      longitude: 37.6,
      faction: 'Attacking',
      side: 'hostile',
      eventType: 'Artillery/Shelling',
      destroyed: false,
      iconUrl: '/icons/E00000/False/icons/transparent/50.png',
    };

    it('preserves location and timestamp on EventRecord', () => {
      const out = normalizeGeoConfirmedEvent(event);
      expect(out.id).toBe('geoconfirmed-gc-99');
      expect(out.source).toBe('geoconfirmed');
      expect(out.coordinates).toEqual([37.6, 49.2]);
      expect(out.timestamp).toBe(new Date(event.date).toISOString());
    });

    it('returns empty array for empty GeoConfirmed input', () => {
      expect(normalizeGeoConfirmedEvents([])).toEqual([]);
    });
  });

  describe('UCDP', () => {
    it('normalizes to EventRecord with expected id and coords', () => {
      const u = minimalUcdp();
      const out = normalizeUCDPEvent(u);
      expect(out.id).toBe('ucdp-42');
      expect(out.source).toBe('ucdp');
      expect(out.coordinates).toEqual([38, 48.5]);
      expect(out.timestamp).toBe(new Date('2020-06-15').toISOString());
      expect(out.eventType).toBe('State-based conflict');
    });

    it('returns empty array for empty UCDP input', () => {
      expect(normalizeUCDPEvents([])).toEqual([]);
    });
  });
});
