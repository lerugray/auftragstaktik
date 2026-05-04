import { z } from 'zod';

/** GeoConfirmed placemark after in-fetch mapping (see `GeoConfirmedEvent` in geoconfirmed.ts). */
export const GeoConfirmedEventSchema = z.object({
  id: z.string(),
  date: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  faction: z.string(),
  side: z.string(),
  eventType: z.string(),
  destroyed: z.boolean(),
  iconUrl: z.string(),
});

const polygonRing = z.array(z.array(z.number()));
const polygonCoordinates = z.array(polygonRing);
const multiPolygonCoordinates = z.array(polygonCoordinates);

export const DeepStateFeatureSchema = z
  .object({
    type: z.literal('Feature'),
    properties: z.record(z.string(), z.unknown()),
    geometry: z.object({
      type: z.enum(['Polygon', 'MultiPolygon']),
      coordinates: z.union([polygonCoordinates, multiPolygonCoordinates]),
    }),
  })
  .passthrough();

/** DeepState GeoJSON FeatureCollection (see `DeepStateGeoJSON` in deepstate.ts). */
export const DeepStateFrontlineSchema = z
  .object({
    type: z.literal('FeatureCollection'),
    features: z.array(DeepStateFeatureSchema),
  })
  .passthrough();

/**
 * Normalized ADSB aircraft row returned by `fetchAircraftData` (see `AircraftRecord` in types/events).
 * Raw upstream uses `hex`; the app maps to `icao` before the API responds.
 */
export const AdsbAircraftSchema = z.object({
  icao: z.string(),
  callsign: z.string(),
  registration: z.string().optional(),
  aircraftType: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  altitude: z.number(),
  speed: z.number(),
  heading: z.number(),
  verticalRate: z.number().optional(),
  onGround: z.boolean(),
  timestamp: z.string(),
  military: z.boolean(),
  country: z.string().optional(),
});

const vesselClassificationSchema = z.enum([
  'military',
  'law-enforcement',
  'coast-guard',
  'auxiliary',
  'merchant',
  'fishing',
  'unknown',
]);

/** Maritime vessel row from AISStream collector (see `MaritimeRecord` in types/events). */
export const AisstreamMaritimeSchema = z.object({
  mmsi: z.string(),
  name: z.string(),
  imo: z.string().optional(),
  callsign: z.string().optional(),
  vesselType: z.number(),
  classification: vesselClassificationSchema,
  latitude: z.number(),
  longitude: z.number(),
  speed: z.number(),
  heading: z.number(),
  course: z.number().optional(),
  destination: z.string().optional(),
  flag: z.string().optional(),
  shipClass: z.string().optional(),
  timestamp: z.string(),
});

/** UCDP GED event (see `UCDPEvent` in ucdpGed.ts). */
export const UcdpEventSchema = z.object({
  id: z.number(),
  relid: z.string(),
  year: z.number(),
  date_start: z.string(),
  date_end: z.string(),
  active_year: z.boolean(),
  type_of_violence: z.number(),
  conflict_name: z.string(),
  dyad_name: z.string(),
  side_a: z.string(),
  side_b: z.string(),
  country: z.string(),
  region: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  geom_wkt: z.string(),
  priogrid_gid: z.number(),
  where_prec: z.number(),
  date_prec: z.number(),
  deaths_a: z.number(),
  deaths_b: z.number(),
  deaths_civilians: z.number(),
  deaths_unknown: z.number(),
  best: z.number(),
  high: z.number(),
  low: z.number(),
  source_article: z.string(),
  source_office: z.string(),
  source_date: z.string(),
  source_headline: z.string(),
  source_original: z.string(),
});
