import { describe, expect, it } from 'vitest';
import {
  AdsbAircraftSchema,
  AisstreamMaritimeSchema,
  DeepStateFrontlineSchema,
  GeoConfirmedEventSchema,
  UcdpEventSchema,
} from '@/lib/data/schemas';

describe('GeoConfirmedEventSchema', () => {
  const validFull = {
    id: 'evt-1',
    date: '2024-01-15',
    latitude: 48.5,
    longitude: 37.6,
    faction: 'Defending',
    side: 'friendly',
    eventType: 'Drone strike',
    destroyed: true,
    iconUrl: '/icons/0000FF/True/icons/transparent/93.png',
  };

  it('accepts a valid full record', () => {
    const r = GeoConfirmedEventSchema.safeParse(validFull);
    expect(r.success).toBe(true);
  });

  it('accepts minimal required fields with empty iconUrl', () => {
    const r = GeoConfirmedEventSchema.safeParse({
      id: 'x',
      date: '2020-01-01',
      latitude: 0,
      longitude: 0,
      faction: '',
      side: 'unknown',
      eventType: 'Conflict event',
      destroyed: false,
      iconUrl: '',
    });
    expect(r.success).toBe(true);
  });

  it('rejects when a required string field is missing', () => {
    const { id: _i, ...rest } = validFull;
    const r = GeoConfirmedEventSchema.safeParse(rest);
    expect(r.success).toBe(false);
  });

  it('rejects string latitude', () => {
    const r = GeoConfirmedEventSchema.safeParse({ ...validFull, latitude: '48.5' });
    expect(r.success).toBe(false);
  });

  it('rejects null longitude', () => {
    const r = GeoConfirmedEventSchema.safeParse({ ...validFull, longitude: null });
    expect(r.success).toBe(false);
  });
});

describe('DeepStateFrontlineSchema', () => {
  const closedRing = [
    [30, 50],
    [31, 50],
    [31, 51],
    [30, 50],
  ];
  const validFull = {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        properties: { name: 'Occupied', status: 'occupied' },
        geometry: { type: 'Polygon' as const, coordinates: [closedRing] },
      },
      {
        type: 'Feature' as const,
        properties: { name: 'Other' },
        geometry: {
          type: 'MultiPolygon' as const,
          coordinates: [[closedRing]],
        },
      },
    ],
  };

  it('accepts a valid FeatureCollection with Polygon and MultiPolygon', () => {
    const r = DeepStateFrontlineSchema.safeParse(validFull);
    expect(r.success).toBe(true);
  });

  it('accepts a minimal single-feature collection', () => {
    const r = DeepStateFrontlineSchema.safeParse({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [closedRing] },
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it('rejects when root type is missing', () => {
    const { type: _t, ...rest } = validFull;
    const r = DeepStateFrontlineSchema.safeParse(rest);
    expect(r.success).toBe(false);
  });

  it('rejects coordinate ring with string ordinate', () => {
    const badRing = [
      [30, 50],
      [31, '50'],
      [31, 51],
      [30, 50],
    ];
    const r = DeepStateFrontlineSchema.safeParse({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [badRing] },
        },
      ],
    });
    expect(r.success).toBe(false);
  });

  it('rejects null nested coordinate', () => {
    const r = DeepStateFrontlineSchema.safeParse({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [[null, [31, 50]]] },
        },
      ],
    });
    expect(r.success).toBe(false);
  });
});

describe('AdsbAircraftSchema', () => {
  const validFull = {
    icao: 'abc123',
    callsign: 'NATO01',
    registration: 'N12345',
    aircraftType: 'C130',
    latitude: 50.1,
    longitude: 30.2,
    altitude: 32000,
    speed: 400,
    heading: 270,
    verticalRate: -1200,
    onGround: false,
    timestamp: '2024-01-01T00:00:00.000Z',
    military: true,
    country: 'US',
  };

  it('accepts a valid full record', () => {
    const r = AdsbAircraftSchema.safeParse(validFull);
    expect(r.success).toBe(true);
  });

  it('accepts minimal record without optional fields', () => {
    const r = AdsbAircraftSchema.safeParse({
      icao: 'def456',
      callsign: '',
      latitude: 0,
      longitude: 0,
      altitude: 0,
      speed: 0,
      heading: 0,
      onGround: true,
      timestamp: new Date().toISOString(),
      military: false,
    });
    expect(r.success).toBe(true);
  });

  it('rejects missing icao', () => {
    const { icao: _i, ...rest } = validFull;
    const r = AdsbAircraftSchema.safeParse(rest);
    expect(r.success).toBe(false);
  });

  it('rejects string latitude', () => {
    const r = AdsbAircraftSchema.safeParse({ ...validFull, latitude: '50' });
    expect(r.success).toBe(false);
  });

  it('rejects null altitude', () => {
    const r = AdsbAircraftSchema.safeParse({ ...validFull, altitude: null });
    expect(r.success).toBe(false);
  });
});

describe('AisstreamMaritimeSchema', () => {
  const validFull = {
    mmsi: '273123456',
    name: 'TEST VESSEL',
    imo: '1234567',
    callsign: 'TEST1',
    vesselType: 35,
    classification: 'military' as const,
    latitude: 45.0,
    longitude: 36.0,
    speed: 12,
    heading: 90,
    course: 88,
    destination: 'Sevastopol',
    flag: 'RU',
    shipClass: 'Frigate',
    timestamp: '2024-01-01T00:00:00.000Z',
  };

  it('accepts a valid full record', () => {
    const r = AisstreamMaritimeSchema.safeParse(validFull);
    expect(r.success).toBe(true);
  });

  it('accepts minimal record without optional fields', () => {
    const r = AisstreamMaritimeSchema.safeParse({
      mmsi: '123456789',
      name: 'X',
      vesselType: 0,
      classification: 'unknown',
      latitude: 0,
      longitude: 0,
      speed: 0,
      heading: 0,
      timestamp: '2024-01-01T00:00:00.000Z',
    });
    expect(r.success).toBe(true);
  });

  it('rejects missing mmsi', () => {
    const { mmsi: _m, ...rest } = validFull;
    const r = AisstreamMaritimeSchema.safeParse(rest);
    expect(r.success).toBe(false);
  });

  it('rejects string latitude', () => {
    const r = AisstreamMaritimeSchema.safeParse({ ...validFull, latitude: '45' });
    expect(r.success).toBe(false);
  });

  it('rejects null vesselType', () => {
    const r = AisstreamMaritimeSchema.safeParse({ ...validFull, vesselType: null });
    expect(r.success).toBe(false);
  });
});

describe('UcdpEventSchema', () => {
  const validFull = {
    id: 1,
    relid: 'r1',
    year: 2020,
    date_start: '2020-01-01',
    date_end: '2020-01-02',
    active_year: true,
    type_of_violence: 1,
    conflict_name: 'C',
    dyad_name: 'A vs B',
    side_a: 'A',
    side_b: 'B',
    country: 'Ukraine',
    region: '',
    latitude: 48,
    longitude: 38,
    geom_wkt: '',
    priogrid_gid: 0,
    where_prec: 0,
    date_prec: 0,
    deaths_a: 0,
    deaths_b: 0,
    deaths_civilians: 0,
    deaths_unknown: 0,
    best: 1,
    high: 1,
    low: 1,
    source_article: '',
    source_office: '',
    source_date: '',
    source_headline: '',
    source_original: '',
  };

  it('accepts a valid full record', () => {
    const r = UcdpEventSchema.safeParse(validFull);
    expect(r.success).toBe(true);
  });

  it('accepts minimal strings and zero numerics where allowed', () => {
    const r = UcdpEventSchema.safeParse({
      ...validFull,
      relid: '',
      conflict_name: '',
      dyad_name: '',
      side_a: '',
      side_b: '',
    });
    expect(r.success).toBe(true);
  });

  it('rejects missing country', () => {
    const { country: _c, ...rest } = validFull;
    const r = UcdpEventSchema.safeParse(rest);
    expect(r.success).toBe(false);
  });

  it('rejects string latitude', () => {
    const r = UcdpEventSchema.safeParse({ ...validFull, latitude: '48' });
    expect(r.success).toBe(false);
  });

  it('rejects null best estimate', () => {
    const r = UcdpEventSchema.safeParse({ ...validFull, best: null });
    expect(r.success).toBe(false);
  });
});
