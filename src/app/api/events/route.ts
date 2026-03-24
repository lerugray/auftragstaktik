import { NextRequest, NextResponse } from 'next/server';
import { fetchGeoConfirmedEvents } from '@/lib/data/geoconfirmed';
import { normalizeGeoConfirmedEvents } from '@/lib/processing/eventNormalizer';
import { deduplicateEvents } from '@/lib/processing/deduplicator';
import { severityOrder } from '@/lib/processing/severityTagger';
import { fetchMultipleChannels } from '@/lib/data/telegram';
import { geoTagText } from '@/lib/data/gazetteer';
import type { EventRecord, Severity } from '@/lib/types/events';

// Keyword-based severity for Telegram posts
function detectSeverity(text: string): Severity {
  if (/missile|ballistic|nuclear|chemical|mass casualt/i.test(text)) return 'critical';
  if (/strike|bomb|shell|artiller|drone attack|offensive|breakthrough/i.test(text)) return 'high';
  if (/clash|fight|assault|advance|retreat|captured|destroy/i.test(text)) return 'medium';
  if (/fortif|trench|deploy|reinforce|movement|convoy/i.test(text)) return 'low';
  return 'info';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const conflictsParam = searchParams.get('conflicts') || 'ukraine';
    const telegramChannels = searchParams.get('telegram')?.split(',').filter(Boolean) || [];
    const severityFilter = searchParams.get('severity')?.split(',') as Severity[] | undefined;

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

    // Fetch Telegram channel posts
    if (telegramChannels.length > 0) {
      try {
        const posts = await fetchMultipleChannels(telegramChannels);
        for (const post of posts) {
          const displayText = post.translatedText || post.text;
          const geo = geoTagText(post.text) || geoTagText(displayText);
          allEvents.push({
            id: `tg-${post.id}`,
            source: 'telegram',
            timestamp: new Date(post.date).toISOString(),
            coordinates: geo ? [geo.lng, geo.lat] : [0, 0],
            eventType: 'Telegram Report',
            severity: detectSeverity(displayText),
            title: displayText.substring(0, 120) + (displayText.length > 120 ? '...' : ''),
            description: displayText,
            rawData: {
              channel: post.channel,
              originalText: post.text,
              link: post.link,
              geoTagged: !!geo,
              locationName: geo?.name,
            },
          });
        }
      } catch (err) {
        console.error('Failed to fetch Telegram posts:', err);
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
        geoconfirmed: { status: 'connected', eventCount: allEvents.filter(e => e.source === 'geoconfirmed').length },
        telegram: { status: telegramChannels.length > 0 ? 'connected' : 'disabled', eventCount: allEvents.filter(e => e.source === 'telegram').length },
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
