/**
 * UCDP GED (Georeferenced Event Dataset) v25.1 — pre-filtered static data.
 *
 * Source: Uppsala Conflict Data Program, https://ucdp.uu.se/downloads/
 * License: CC BY 4.0
 *
 * Contains 140,770 events filtered to:
 *   - Bosnia-Herzegovina, Croatia, Serbia (Yugoslavia): 1991–2001
 *   - Iraq, Kuwait: 1990–2011
 *   - Afghanistan: 2001–2021
 *   - Syria: 2011–2023
 *
 * Data is stored as a compact JSON file in /public/data/ucdp-ged-filtered.json
 * using dictionary-encoded string fields and integer-packed coordinates to keep
 * the file at ~5.8 MB instead of ~73 MB.
 */

import type { UCDPEvent } from './ucdpGed';

// ── Compact format types ──────────────────────────────────────────────

/** Epoch date for day-offset calculation (1989-01-01) */
const EPOCH_MS = new Date('1989-01-01T00:00:00Z').getTime();
const MS_PER_DAY = 86_400_000;

/**
 * Each event is stored as a 14-element integer array:
 * [0]  dayOffset      — days since 1989-01-01
 * [1]  lat1000        — latitude * 1000 (integer)
 * [2]  lon1000        — longitude * 1000 (integer)
 * [3]  countryIdx     — index into countries[]
 * [4]  typeOfViolence — 1=state-based, 2=non-state, 3=one-sided
 * [5]  conflictIdx    — index into conflicts[]
 * [6]  dyadIdx        — index into dyads[]
 * [7]  sideAIdx       — index into sidesA[]
 * [8]  sideBIdx       — index into sidesB[]
 * [9]  deathsA
 * [10] deathsB
 * [11] deathsCiv
 * [12] deathsUnk
 * [13] bestDeaths     — best estimate of total deaths
 */
type CompactEvent = number[];

interface CompactGedData {
  meta: {
    source: string;
    url: string;
    epoch: string;
    fields: string[];
  };
  countries: string[];
  conflicts: string[];
  dyads: string[];
  sidesA: string[];
  sidesB: string[];
  events: CompactEvent[];
}

// ── Loader ────────────────────────────────────────────────────────────

let _cache: UCDPEvent[] | null = null;
let _loading: Promise<UCDPEvent[]> | null = null;

function dayOffsetToDate(offset: number): string {
  const d = new Date(EPOCH_MS + offset * MS_PER_DAY);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function decodeEvents(data: CompactGedData): UCDPEvent[] {
  const { countries, conflicts, dyads, sidesA, sidesB, events } = data;
  const decoded: UCDPEvent[] = new Array(events.length);

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const dateStr = dayOffsetToDate(e[0]);

    decoded[i] = {
      id: i + 1,
      relid: '',
      year: new Date(EPOCH_MS + e[0] * MS_PER_DAY).getUTCFullYear(),
      date_start: dateStr,
      date_end: dateStr,
      active_year: true,
      type_of_violence: e[4],
      conflict_name: conflicts[e[5]],
      dyad_name: dyads[e[6]],
      side_a: sidesA[e[7]],
      side_b: sidesB[e[8]],
      country: countries[e[3]],
      region: '',
      latitude: e[1] / 1000,
      longitude: e[2] / 1000,
      geom_wkt: '',
      priogrid_gid: 0,
      where_prec: 0,
      date_prec: 0,
      deaths_a: e[9],
      deaths_b: e[10],
      deaths_civilians: e[11],
      deaths_unknown: e[12],
      best: e[13],
      high: e[13],
      low: e[13],
      source_article: '',
      source_office: '',
      source_date: '',
      source_headline: '',
      source_original: '',
    };
  }

  return decoded;
}

/**
 * Load all pre-filtered UCDP GED events from the static JSON file.
 * Results are cached after first load.
 */
export async function loadUCDPGedData(): Promise<UCDPEvent[]> {
  if (_cache) return _cache;

  if (!_loading) {
    _loading = fetch('/data/ucdp-ged-filtered.json')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load UCDP GED data: ${res.status}`);
        return res.json() as Promise<CompactGedData>;
      })
      .then((data) => {
        _cache = decodeEvents(data);
        _loading = null;
        return _cache;
      })
      .catch((err) => {
        _loading = null;
        console.error('UCDP GED data load error:', err);
        return [] as UCDPEvent[];
      });
  }

  return _loading;
}

/**
 * Load UCDP GED events filtered to specific countries and year range.
 */
export async function loadUCDPGedFiltered(
  countries: string[],
  startYear: number,
  endYear: number
): Promise<UCDPEvent[]> {
  const all = await loadUCDPGedData();
  const countrySet = new Set(countries);
  return all.filter(
    (e) => countrySet.has(e.country) && e.year >= startYear && e.year <= endYear
  );
}

/** Available conflict theaters in the dataset */
export const UCDP_THEATERS = {
  balkans: {
    label: 'Yugoslav Wars',
    countries: ['Bosnia-Herzegovina', 'Croatia', 'Serbia (Yugoslavia)'],
    yearRange: [1991, 2001] as [number, number],
  },
  gulf: {
    label: 'Gulf War & Iraq War',
    countries: ['Iraq', 'Kuwait'],
    yearRange: [1990, 2011] as [number, number],
  },
  afghanistan: {
    label: 'War in Afghanistan',
    countries: ['Afghanistan'],
    yearRange: [2001, 2021] as [number, number],
  },
  syria: {
    label: 'Syrian Civil War',
    countries: ['Syria'],
    yearRange: [2011, 2023] as [number, number],
  },
} as const;

export type UCDPTheaterKey = keyof typeof UCDP_THEATERS;
