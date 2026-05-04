import { describe, expect, it } from 'vitest';
import type { EventRecord } from '@/lib/types/events';
import { deduplicateEvents } from '@/lib/processing/deduplicator';

function event(
  partial: Pick<EventRecord, 'source' | 'timestamp' | 'coordinates' | 'eventType'> &
    Partial<Omit<EventRecord, 'source' | 'timestamp' | 'coordinates' | 'eventType'>>
): EventRecord {
  return {
    id: partial.id ?? `${partial.source}-${partial.timestamp}`,
    source: partial.source,
    timestamp: partial.timestamp,
    coordinates: partial.coordinates,
    eventType: partial.eventType,
    severity: partial.severity ?? 'info',
    title: partial.title ?? 'Title',
    description: partial.description ?? '',
    rawData: partial.rawData ?? {},
  };
}

describe('deduplicateEvents', () => {
  const t0 = '2024-06-01T12:00:00.000Z';
  const t1h = '2024-06-01T13:00:00.000Z';
  const t3h = '2024-06-01T15:00:00.000Z';

  // ~same spot (Kyiv center)
  const lng = 30.5233;
  const lat = 50.45;

  it('returns empty array for empty input', () => {
    expect(deduplicateEvents([])).toEqual([]);
  });

  it('returns single event unchanged', () => {
    const only = event({
      source: 'geoconfirmed',
      timestamp: t0,
      coordinates: [lng, lat],
      eventType: 'Strike',
    });
    expect(deduplicateEvents([only])).toEqual([only]);
  });

  it('collapses cross-source duplicates within 5km and 2h with same eventType', () => {
    const a = event({
      id: 'a1',
      source: 'acled',
      timestamp: t0,
      coordinates: [lng, lat],
      eventType: 'Explosion/Strike',
    });
    const b = event({
      id: 'b1',
      source: 'geoconfirmed',
      timestamp: t1h,
      coordinates: [lng, lat],
      eventType: 'Explosion/Strike',
    });
    const out = deduplicateEvents([a, b]);
    expect(out).toHaveLength(1);
    expect(out[0]).toBe(a);
  });

  it('keeps events more than 5km apart even at the same time', () => {
    // ~6km east at this latitude (roughly 0.09° lon ≈ 6km)
    const farLng = lng + 0.09;
    const a = event({
      source: 'acled',
      timestamp: t0,
      coordinates: [lng, lat],
      eventType: 'Strike',
    });
    const b = event({
      source: 'geoconfirmed',
      timestamp: t0,
      coordinates: [farLng, lat],
      eventType: 'Strike',
    });
    expect(deduplicateEvents([a, b])).toHaveLength(2);
  });

  it('keeps events more than 2 hours apart even at the same coordinates', () => {
    const a = event({
      source: 'acled',
      timestamp: t0,
      coordinates: [lng, lat],
      eventType: 'Strike',
    });
    const b = event({
      source: 'geoconfirmed',
      timestamp: t3h,
      coordinates: [lng, lat],
      eventType: 'Strike',
    });
    expect(deduplicateEvents([a, b])).toHaveLength(2);
  });

  it('does not dedupe two events from the same source', () => {
    const a = event({
      id: 'g1',
      source: 'geoconfirmed',
      timestamp: t0,
      coordinates: [lng, lat],
      eventType: 'Strike',
    });
    const b = event({
      id: 'g2',
      source: 'geoconfirmed',
      timestamp: t0,
      coordinates: [lng, lat],
      eventType: 'Strike',
    });
    expect(deduplicateEvents([a, b])).toHaveLength(2);
  });

  it('keeps both when proximity matches but eventType differs', () => {
    const a = event({
      source: 'acled',
      timestamp: t0,
      coordinates: [lng, lat],
      eventType: 'Strike',
    });
    const b = event({
      source: 'geoconfirmed',
      timestamp: t1h,
      coordinates: [lng, lat],
      eventType: 'Artillery/Shelling',
    });
    expect(deduplicateEvents([a, b])).toHaveLength(2);
  });
});
