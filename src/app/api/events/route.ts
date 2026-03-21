import { NextRequest, NextResponse } from 'next/server';
import { fetchGeoConfirmedEvents } from '@/lib/data/geoconfirmed';
import { normalizeGeoConfirmedEvents } from '@/lib/processing/eventNormalizer';
import { deduplicateEvents } from '@/lib/processing/deduplicator';
import { severityOrder } from '@/lib/processing/severityTagger';
import type { EventRecord, Severity } from '@/lib/types/events';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const conflictsParam = searchParams.get('conflicts') || 'ukraine';
    const severityFilter = searchParams.get('severity')?.split(',') as Severity[] | undefined;

    // Support comma-separated conflict slugs (e.g., "israel,syria,yemen,iran")
    const conflicts = conflictsParam.split(',').map(s => s.trim()).filter(Boolean);

    const allEvents: EventRecord[] = [];

    // Fetch GeoConfirmed events for each conflict slug
    for (const conflict of conflicts) {
      try {
        const geoData = await fetchGeoConfirmedEvents(conflict, 5, 50);
        const normalized = normalizeGeoConfirmedEvents(geoData);
        allEvents.push(...normalized);
      } catch (err) {
        console.error(`Failed to fetch GeoConfirmed events for ${conflict}:`, err);
      }
    }

    // Deduplicate across sources
    let events = deduplicateEvents(allEvents);

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
      sources: {
        geoconfirmed: { status: 'connected', eventCount: events.length },
      },
    });
  } catch (error) {
    console.error('Events API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch aggregated events' },
      { status: 502 }
    );
  }
}
