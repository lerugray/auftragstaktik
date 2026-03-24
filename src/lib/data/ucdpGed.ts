import { cacheGet, cacheSet } from './cache';

const CACHE_KEY_PREFIX = 'ucdp-ged';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes (historical data doesn't change often)

// UCDP GED API — Uppsala Conflict Data Program, Georeferenced Event Dataset
// Covers 1989-2023, global, geocoded, CC BY 4.0
// API docs: https://ucdpapi.pcr.uu.se/api/gedevents/
const API_BASE = 'https://ucdpapi.pcr.uu.se/api/gedevents';
const API_VERSION = '24.1'; // Latest available version

export interface UCDPEvent {
  id: number;
  relid: string; // Unique event identifier
  year: number;
  date_start: string;
  date_end: string;
  active_year: boolean;
  type_of_violence: number; // 1=state-based, 2=non-state, 3=one-sided
  conflict_name: string;
  dyad_name: string;
  side_a: string;
  side_b: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  geom_wkt: string;
  priogrid_gid: number;
  where_prec: number;
  date_prec: number;
  deaths_a: number;
  deaths_b: number;
  deaths_civilians: number;
  deaths_unknown: number;
  best: number; // Best estimate of total deaths
  high: number; // High estimate
  low: number; // Low estimate
  source_article: string;
  source_office: string;
  source_date: string;
  source_headline: string;
  source_original: string;
}

export interface UCDPApiResponse {
  TotalCount: number;
  NextPageUrl: string | null;
  PreviousPageUrl: string | null;
  Result: UCDPEvent[];
}

// Violence type labels
export const VIOLENCE_TYPES: Record<number, string> = {
  1: 'State-based conflict',
  2: 'Non-state conflict',
  3: 'One-sided violence',
};

/**
 * Fetch UCDP GED events for a country and year range.
 * Uses the UCDP API with pagination.
 */
export async function fetchUCDPEvents(
  country: string,
  startYear: number,
  endYear: number,
  maxPages: number = 10,
  pageSize: number = 100
): Promise<UCDPEvent[]> {
  const cacheKey = `${CACHE_KEY_PREFIX}-${country}-${startYear}-${endYear}`;
  const cached = cacheGet<UCDPEvent[]>(cacheKey);
  if (cached) return cached;

  const allEvents: UCDPEvent[] = [];
  let page = 0;

  for (let i = 0; i < maxPages; i++) {
    try {
      const url = `${API_BASE}/${API_VERSION}?pagesize=${pageSize}&page=${page}&Country=${encodeURIComponent(country)}&StartDate=${startYear}-01-01&EndDate=${endYear}-12-31`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`UCDP API error: ${res.status} ${res.statusText}`);
        break;
      }

      const data: UCDPApiResponse = await res.json();
      if (!data.Result || data.Result.length === 0) break;

      allEvents.push(...data.Result);

      if (!data.NextPageUrl) break;
      page++;
    } catch (err) {
      console.error(`UCDP GED fetch error (page ${page}):`, err);
      break;
    }
  }

  cacheSet(cacheKey, allEvents, CACHE_TTL);
  return allEvents;
}

/**
 * Fetch UCDP GED events by multiple countries for a year range.
 */
export async function fetchUCDPEventsMultiCountry(
  countries: string[],
  startYear: number,
  endYear: number,
  maxPagesPerCountry: number = 10
): Promise<UCDPEvent[]> {
  const cacheKey = `${CACHE_KEY_PREFIX}-multi-${countries.join(',')}-${startYear}-${endYear}`;
  const cached = cacheGet<UCDPEvent[]>(cacheKey);
  if (cached) return cached;

  const allEvents: UCDPEvent[] = [];

  for (const country of countries) {
    const events = await fetchUCDPEvents(country, startYear, endYear, maxPagesPerCountry);
    allEvents.push(...events);
  }

  // Sort by date
  allEvents.sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());

  cacheSet(cacheKey, allEvents, CACHE_TTL);
  return allEvents;
}
