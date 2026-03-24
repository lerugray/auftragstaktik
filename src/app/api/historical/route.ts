import { NextRequest, NextResponse } from 'next/server';
import { fetchUCDPEventsMultiCountry } from '@/lib/data/ucdpGed';
import { normalizeUCDPEvents } from '@/lib/processing/eventNormalizer';
import { severityOrder } from '@/lib/processing/severityTagger';
import type { EventRecord, Severity } from '@/lib/types/events';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const countriesParam = searchParams.get('countries') || '';
    const startYear = parseInt(searchParams.get('startYear') || '2000', 10);
    const endYear = parseInt(searchParams.get('endYear') || '2023', 10);
    const severityFilter = searchParams.get('severity')?.split(',') as Severity[] | undefined;
    // Year filter — for timeline scrubber to request a specific year window
    const filterStartYear = searchParams.get('filterStartYear') ? parseInt(searchParams.get('filterStartYear')!, 10) : null;
    const filterEndYear = searchParams.get('filterEndYear') ? parseInt(searchParams.get('filterEndYear')!, 10) : null;

    const countries = countriesParam.split(',').map(s => s.trim()).filter(Boolean);

    if (countries.length === 0) {
      return NextResponse.json({ events: [], count: 0, sources: { ucdp: { status: 'error', eventCount: 0 } } });
    }

    // Determine the actual year range to query — use filter if provided, else full range
    const queryStart = filterStartYear ?? startYear;
    const queryEnd = filterEndYear ?? endYear;

    const ucdpEvents = await fetchUCDPEventsMultiCountry(countries, queryStart, queryEnd);
    let events: EventRecord[] = normalizeUCDPEvents(ucdpEvents);

    // Filter by severity if requested
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
