import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { normalizeUCDPEvents } from '@/lib/processing/eventNormalizer';
import { severityOrder } from '@/lib/processing/severityTagger';
import type { UCDPEvent } from '@/lib/data/ucdpGed';
import type { EventRecord, Severity } from '@/lib/types/events';

// ── Server-side UCDP GED loader (reads from public/data/) ───────────

const EPOCH_MS = new Date('1989-01-01T00:00:00Z').getTime();
const MS_PER_DAY = 86_400_000;

interface CompactGedData {
  countries: string[];
  conflicts: string[];
  dyads: string[];
  sidesA: string[];
  sidesB: string[];
  events: number[][];
}

let _cache: UCDPEvent[] | null = null;

function loadGedData(): UCDPEvent[] {
  if (_cache) return _cache;

  const filePath = join(process.cwd(), 'public', 'data', 'ucdp-ged-filtered.json');
  const raw = readFileSync(filePath, 'utf-8');
  const data: CompactGedData = JSON.parse(raw);

  const { countries, conflicts, dyads, sidesA, sidesB, events } = data;
  const decoded: UCDPEvent[] = new Array(events.length);

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const ms = EPOCH_MS + e[0] * MS_PER_DAY;
    const d = new Date(ms);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;

    decoded[i] = {
      id: i + 1,
      relid: '',
      year: y,
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

  _cache = decoded;
  return decoded;
}

function filterByCountryAndYear(
  events: UCDPEvent[],
  countries: string[],
  startYear: number,
  endYear: number
): UCDPEvent[] {
  const countrySet = new Set(countries);
  return events.filter(
    (e) => countrySet.has(e.country) && e.year >= startYear && e.year <= endYear
  );
}

// ── Route handler ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const countriesParam = searchParams.get('countries') || '';
    const startYear = parseInt(searchParams.get('startYear') || '2000', 10);
    const endYear = parseInt(searchParams.get('endYear') || '2023', 10);
    const severityFilter = searchParams.get('severity')?.split(',') as Severity[] | undefined;
    const filterStartYear = searchParams.get('filterStartYear') ? parseInt(searchParams.get('filterStartYear')!, 10) : null;
    const filterEndYear = searchParams.get('filterEndYear') ? parseInt(searchParams.get('filterEndYear')!, 10) : null;

    const countries = countriesParam.split(',').map(s => s.trim()).filter(Boolean);

    if (countries.length === 0) {
      return NextResponse.json({ events: [], count: 0, sources: { ucdp: { status: 'error', eventCount: 0 } } });
    }

    const queryStart = filterStartYear ?? startYear;
    const queryEnd = filterEndYear ?? endYear;

    const allEvents = loadGedData();
    const ucdpEvents = filterByCountryAndYear(allEvents, countries, queryStart, queryEnd);
    let events: EventRecord[] = normalizeUCDPEvents(ucdpEvents);

    if (severityFilter && severityFilter.length > 0) {
      events = events.filter((e) => severityFilter.includes(e.severity));
    }

    // Sort by timestamp descending, then severity
    events.sort((a, b) => {
      const timeDiff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      if (timeDiff !== 0) return timeDiff;
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return NextResponse.json({
      events,
      count: events.length,
      totalUcdpEvents: ucdpEvents.length,
      sources: {
        ucdp: { status: 'connected', eventCount: events.length },
      },
    });
  } catch (error) {
    console.error('Historical API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch historical events' },
      { status: 502 }
    );
  }
}
