export type EventSource = 'deepstate' | 'adsb' | 'aisstream' | 'geoconfirmed' | 'acled' | 'telegram';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type VesselClassification = 'military' | 'law-enforcement' | 'coast-guard' | 'auxiliary' | 'merchant' | 'fishing' | 'unknown';

export interface EventRecord {
  id: string;
  source: EventSource;
  timestamp: string; // ISO 8601
  coordinates: [number, number]; // [lng, lat]
  eventType: string;
  severity: Severity;
  title: string;
  description: string;
  rawData: Record<string, unknown>;
  sidc?: string; // MIL-STD-2525 Symbol ID Code
}

export interface AircraftRecord {
  icao: string;
  callsign: string;
  registration?: string;
  aircraftType?: string;
  latitude: number;
  longitude: number;
  altitude: number; // feet
  speed: number; // knots
  heading: number; // degrees
  verticalRate?: number;
  onGround: boolean;
  timestamp: string;
  military: boolean;
  country?: string;
}

export interface MaritimeRecord {
  mmsi: string;
  name: string;
  imo?: string;
  callsign?: string;
  vesselType: number;
  classification: VesselClassification;
  latitude: number;
  longitude: number;
  speed: number; // knots
  heading: number; // degrees
  course?: number;
  destination?: string;
  flag?: string;
  shipClass?: string; // e.g., "Kilo-class submarine", "Frigate"
  timestamp: string;
}

export interface ACLEDRecord {
  eventId: string;
  eventDate: string;
  eventType: string;
  subEventType: string;
  actor1: string;
  actor2?: string;
  country: string;
  admin1?: string;
  admin2?: string;
  location: string;
  latitude: number;
  longitude: number;
  fatalities: number;
  notes?: string;
  source?: string;
  sourceScale?: string;
}

export interface DeepStateFeature {
  type: 'Feature';
  geometry: {
    type: 'MultiPolygon' | 'Polygon';
    coordinates: number[][][] | number[][][][];
  };
  properties: Record<string, unknown>;
}

export interface BriefingRequest {
  theaterId: string;
  regionId?: string;
  timeframeHours: number;
  focusAreas?: string[];
}

export interface BriefingResponse {
  title: string;
  dtg: string; // Date-Time Group
  classification: string;
  sections: {
    situation: string;
    enemyActivity: string;
    friendlyActivity: string;
    maritimeActivity?: string;
    airActivity?: string;
    assessment: string;
    outlook: string;
  };
  generatedAt: string;
  sourceCount: number;
  provider: string;
}

export interface DataSourceStatus {
  source: EventSource;
  status: 'connected' | 'stale' | 'error';
  lastUpdate: string | null;
  eventCount: number;
}
