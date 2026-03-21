import { NextRequest, NextResponse } from 'next/server';
import { fetchMultipleChannels } from '@/lib/data/telegram';
import { geoTagText } from '@/lib/data/gazetteer';
import type { EventRecord, Severity } from '@/lib/types/events';

// Keyword-based severity detection
const SEVERITY_KEYWORDS: { severity: Severity; patterns: RegExp[] }[] = [
  { severity: 'critical', patterns: [/missile/i, /ballistic/i, /nuclear/i, /chemical/i, /mass casualt/i] },
  { severity: 'high', patterns: [/strike/i, /bomb/i, /shell/i, /artiller/i, /drone attack/i, /offensive/i, /breakthrough/i] },
  { severity: 'medium', patterns: [/clash/i, /fight/i, /assault/i, /advance/i, /retreat/i, /captured/i, /destroy/i] },
  { severity: 'low', patterns: [/fortif/i, /trench/i, /deploy/i, /reinforce/i, /movement/i, /convoy/i] },
];

function detectSeverity(text: string): Severity {
  for (const { severity, patterns } of SEVERITY_KEYWORDS) {
    for (const pattern of patterns) {
      if (pattern.test(text)) return severity;
    }
  }
  return 'info';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const channelsParam = searchParams.get('channels') || '';

    if (!channelsParam) {
      return NextResponse.json({ events: [], count: 0 });
    }

    const channels = channelsParam.split(',').map(s => s.trim()).filter(Boolean);
    const posts = await fetchMultipleChannels(channels);

    // Normalize posts into EventRecords
    const events: EventRecord[] = posts.map(post => {
      const displayText = post.translatedText || post.text;
      const geo = geoTagText(post.text) || geoTagText(displayText);
      const severity = detectSeverity(displayText);

      return {
        id: `tg-${post.id}`,
        source: 'telegram' as const,
        timestamp: new Date(post.date).toISOString(),
        coordinates: geo ? [geo.lng, geo.lat] : [0, 0],
        eventType: 'Telegram Report',
        severity,
        title: displayText.substring(0, 120) + (displayText.length > 120 ? '...' : ''),
        description: displayText,
        rawData: {
          channel: post.channel,
          originalText: post.text,
          link: post.link,
          geoTagged: !!geo,
          locationName: geo?.name,
        },
      };
    });

    return NextResponse.json({
      events,
      count: events.length,
    });
  } catch (error) {
    console.error('Telegram API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Telegram data' },
      { status: 502 }
    );
  }
}
