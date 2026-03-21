import { NextRequest, NextResponse } from 'next/server';
import { getLLMProvider, checkOllamaAvailable } from '@/lib/llm';
import { getLLMConfig } from '@/lib/llm/provider';
import { buildBriefingPrompt, ANALYST_SYSTEM_PROMPT } from '@/lib/llm/promptBuilder';
import { filterSlop } from '@/lib/llm/slopFilter';
import type { EventRecord, AircraftRecord, MaritimeRecord, BriefingResponse } from '@/lib/types/events';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      theaterId,
      theaterName,
      theaterConflicts,
      timeframeHours = 24,
      adsbBounds,
      maritimeBounds,
      scopeLabel,
    } = body;

    if (!theaterId || !theaterName) {
      return NextResponse.json({ error: 'Missing theaterId or theaterName' }, { status: 400 });
    }

    // Check provider availability
    const config = getLLMConfig();
    if (config.provider === 'ollama') {
      const available = await checkOllamaAvailable();
      if (!available) {
        return NextResponse.json(
          { error: 'Ollama is not running. Start Ollama to generate briefings.' },
          { status: 503 }
        );
      }
    }

    // Gather data from internal APIs
    const baseUrl = request.nextUrl.origin;
    const adsbStr = (adsbBounds || [0, 0, 0, 0]).join(',');
    const aisStr = (maritimeBounds || [0, 0, 0, 0]).join(',');

    const [eventsRes, aircraftRes, maritimeRes] = await Promise.allSettled([
      fetch(`${baseUrl}/api/events?conflicts=${encodeURIComponent(theaterConflicts || 'ukraine')}`),
      fetch(`${baseUrl}/api/aircraft?bounds=${adsbStr}`),
      fetch(`${baseUrl}/api/maritime?bounds=${aisStr}`),
    ]);

    const events: EventRecord[] = eventsRes.status === 'fulfilled' && eventsRes.value.ok
      ? (await eventsRes.value.json()).events || []
      : [];

    const aircraft: AircraftRecord[] = aircraftRes.status === 'fulfilled' && aircraftRes.value.ok
      ? (await aircraftRes.value.json()).aircraft || []
      : [];

    const vessels: MaritimeRecord[] = maritimeRes.status === 'fulfilled' && maritimeRes.value.ok
      ? (await maritimeRes.value.json()).vessels || []
      : [];

    // Build prompt
    const displayName = scopeLabel || theaterName;
    const prompt = buildBriefingPrompt({
      theaterName: displayName,
      events,
      aircraft,
      vessels,
      timeframeHours,
    });

    // Generate briefing
    const provider = getLLMProvider();
    const rawOutput = await provider.generateText(prompt, ANALYST_SYSTEM_PROMPT);

    // Run slop filter
    const cleanOutput = filterSlop(rawOutput);

    // Parse sections from output
    const sections = parseSections(cleanOutput);

    const now = new Date();
    const dtg = formatDTG(now);

    const briefing: BriefingResponse = {
      title: `SITREP — ${displayName.toUpperCase()}`,
      dtg,
      classification: 'UNCLASSIFIED // OSINT',
      sections,
      generatedAt: now.toISOString(),
      sourceCount: events.length + aircraft.length + vessels.length,
      provider: provider.name,
    };

    return NextResponse.json(briefing);
  } catch (error) {
    console.error('Briefing generation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate briefing';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function parseSections(text: string): BriefingResponse['sections'] {
  const extract = (header: string): string => {
    const regex = new RegExp(`${header}:\\s*\\n([\\s\\S]*?)(?=\\n[A-Z][A-Z ]+:|$)`, 'i');
    const match = text.match(regex);
    return match?.[1]?.trim() || 'No significant activity reported.';
  };

  return {
    situation: extract('SITUATION'),
    enemyActivity: extract('ENEMY ACTIVITY'),
    friendlyActivity: extract('FRIENDLY ACTIVITY'),
    airActivity: extract('AIR ACTIVITY'),
    maritimeActivity: extract('MARITIME ACTIVITY'),
    assessment: extract('ASSESSMENT'),
    outlook: extract('OUTLOOK'),
  };
}

function formatDTG(date: Date): string {
  const day = date.getUTCDate().toString().padStart(2, '0');
  const hour = date.getUTCHours().toString().padStart(2, '0');
  const min = date.getUTCMinutes().toString().padStart(2, '0');
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return `${day}${hour}${min}Z ${month} ${year}`;
}
