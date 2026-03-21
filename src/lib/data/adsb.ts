import { cacheGet, cacheSet } from './cache';
import type { AircraftRecord } from '@/lib/types/events';

const CACHE_KEY = 'adsb-aircraft';
const CACHE_TTL = 10 * 1000; // 10 seconds

const ADSB_API_BASE = 'https://api.adsb.lol/v2';

interface ADSBRawAircraft {
  hex: string;
  flight?: string;
  r?: string; // registration
  t?: string; // aircraft type
  alt_baro?: number | string;
  gs?: number; // ground speed
  track?: number; // heading
  lat?: number;
  lon?: number;
  baro_rate?: number;
  squawk?: string;
  category?: string;
  seen?: number;
  mil?: boolean;
}

function isOnGround(alt: number | string | undefined): boolean {
  if (alt === 'ground') return true;
  if (typeof alt === 'number' && alt <= 0) return true;
  return false;
}

function parseAltitude(alt: number | string | undefined): number {
  if (alt === 'ground' || alt === undefined) return 0;
  if (typeof alt === 'string') return parseInt(alt, 10) || 0;
  return alt;
}

function inferMilitary(raw: ADSBRawAircraft): boolean {
  if (raw.mil) return true;
  // Military squawk codes
  const milSquawks = ['7777', '7700', '0021', '0022', '0023'];
  if (raw.squawk && milSquawks.includes(raw.squawk)) return true;
  // Common military type codes
  const milTypes = ['C130', 'C17', 'C5M', 'KC10', 'KC13', 'KC46', 'E3CF', 'E6B', 'P8', 'RC13', 'B52H', 'F16', 'F15', 'F18', 'F22', 'F35', 'A10', 'V22', 'H60', 'EUFI', 'RFAL', 'TORNADO'];
  if (raw.t && milTypes.some((mt) => raw.t!.toUpperCase().includes(mt))) return true;
  return false;
}

export async function fetchAircraftData(
  bounds: [number, number, number, number] // [west, south, east, north]
): Promise<AircraftRecord[]> {
  const cached = cacheGet<AircraftRecord[]>(CACHE_KEY);
  if (cached) return cached;

  // Calculate center and radius from bounds
  const centerLat = (bounds[1] + bounds[3]) / 2;
  const centerLon = (bounds[0] + bounds[2]) / 2;
  // Rough distance calc — degrees to nautical miles (~60nm per degree)
  const latSpan = bounds[3] - bounds[1];
  const lonSpan = bounds[2] - bounds[0];
  const distNm = Math.max(latSpan, lonSpan) * 60 / 2;

  // Fetch all aircraft in area + military aircraft globally
  const [areaRes, milRes] = await Promise.allSettled([
    fetch(`${ADSB_API_BASE}/lat/${centerLat.toFixed(2)}/lon/${centerLon.toFixed(2)}/dist/${Math.round(distNm)}`),
    fetch(`${ADSB_API_BASE}/mil`),
  ]);

  const allRaw: ADSBRawAircraft[] = [];
  const seenHex = new Set<string>();

  // Process area results
  if (areaRes.status === 'fulfilled' && areaRes.value.ok) {
    const data = await areaRes.value.json();
    for (const ac of (data.ac || [])) {
      if (ac.lat && ac.lon) {
        seenHex.add(ac.hex);
        allRaw.push(ac);
      }
    }
  }

  // Process military results — add any in our bounds that we didn't already get
  if (milRes.status === 'fulfilled' && milRes.value.ok) {
    const data = await milRes.value.json();
    for (const ac of (data.ac || [])) {
      if (ac.lat && ac.lon && !seenHex.has(ac.hex)) {
        // Check if within our extended bounds (with some padding)
        const pad = 3;
        if (ac.lat >= bounds[1] - pad && ac.lat <= bounds[3] + pad &&
            ac.lon >= bounds[0] - pad && ac.lon <= bounds[2] + pad) {
          allRaw.push(ac);
        }
      }
    }
  }

  const records: AircraftRecord[] = allRaw.map((raw) => ({
    icao: raw.hex,
    callsign: (raw.flight || '').trim(),
    registration: raw.r || undefined,
    aircraftType: raw.t || undefined,
    latitude: raw.lat!,
    longitude: raw.lon!,
    altitude: parseAltitude(raw.alt_baro),
    speed: raw.gs || 0,
    heading: raw.track || 0,
    verticalRate: raw.baro_rate || undefined,
    onGround: isOnGround(raw.alt_baro),
    timestamp: new Date().toISOString(),
    military: inferMilitary(raw),
    country: undefined,
  }));

  cacheSet(CACHE_KEY, records, CACHE_TTL);
  return records;
}
