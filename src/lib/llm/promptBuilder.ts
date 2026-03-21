import type { EventRecord, AircraftRecord, MaritimeRecord } from '@/lib/types/events';

export const ANALYST_SYSTEM_PROMPT = `You are a military intelligence analyst producing a SITREP (Situation Report) based on open-source intelligence (OSINT) data. Write in terse, professional military style. Use standard military terminology and abbreviations. No filler, no speculation beyond what the data supports. State facts, identify patterns, assess implications.

Format your response EXACTLY as follows with these section headers:

SITUATION:
(1-2 sentence theater overview)

ENEMY ACTIVITY:
(Key hostile actions observed in the data — strikes, troop movements, equipment losses)

FRIENDLY ACTIVITY:
(Any friendly-side events if present in the data)

AIR ACTIVITY:
(Notable military aircraft activity — types, patterns, areas of operation)

MARITIME ACTIVITY:
(Naval vessel movements if data is available)

ASSESSMENT:
(Pattern analysis — what does this activity suggest about intentions, tempo, focus areas)

OUTLOOK:
(Short-term projection based on observed patterns — what to watch for next)

Keep each section to 2-4 sentences maximum. If no data exists for a section, write "No significant activity reported." Do not invent or assume data that was not provided.`;

interface BriefingContext {
  theaterName: string;
  events: EventRecord[];
  aircraft: AircraftRecord[];
  vessels: MaritimeRecord[];
  timeframeHours: number;
}

export function buildBriefingPrompt(ctx: BriefingContext): string {
  const now = new Date();
  const dtg = formatDTG(now);

  const lines: string[] = [
    `Generate a SITREP for the ${ctx.theaterName} theater as of ${dtg}.`,
    `Timeframe: last ${ctx.timeframeHours} hours.`,
    '',
  ];

  // Events summary
  if (ctx.events.length > 0) {
    lines.push(`=== CONFLICT EVENTS (${ctx.events.length} total) ===`);

    // Group by type
    const byType = new Map<string, number>();
    const bySeverity = new Map<string, number>();
    for (const e of ctx.events) {
      byType.set(e.eventType, (byType.get(e.eventType) || 0) + 1);
      bySeverity.set(e.severity, (bySeverity.get(e.severity) || 0) + 1);
    }

    lines.push('By type: ' + [...byType.entries()].map(([t, c]) => `${t} (${c})`).join(', '));
    lines.push('By severity: ' + [...bySeverity.entries()].map(([s, c]) => `${s} (${c})`).join(', '));
    lines.push('');

    // Include most recent/critical events (up to 30)
    const topEvents = ctx.events
      .sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
        const sa = severityOrder[a.severity as keyof typeof severityOrder] ?? 4;
        const sb = severityOrder[b.severity as keyof typeof severityOrder] ?? 4;
        return sa - sb;
      })
      .slice(0, 30);

    lines.push('Key events:');
    for (const e of topEvents) {
      const ts = e.timestamp.substring(0, 16);
      lines.push(`- [${e.severity.toUpperCase()}] ${ts} | ${e.eventType} | ${e.title}`);
    }
    lines.push('');
  } else {
    lines.push('=== CONFLICT EVENTS ===');
    lines.push('No conflict events in the reporting period.');
    lines.push('');
  }

  // Aircraft summary
  if (ctx.aircraft.length > 0) {
    const milAircraft = ctx.aircraft.filter(a => a.military);
    const civAircraft = ctx.aircraft.filter(a => !a.military);

    lines.push(`=== AIR PICTURE (${ctx.aircraft.length} tracked) ===`);
    lines.push(`Military: ${milAircraft.length} | Civilian: ${civAircraft.length}`);

    if (milAircraft.length > 0) {
      lines.push('Military aircraft:');
      for (const ac of milAircraft.slice(0, 15)) {
        lines.push(`- ${ac.callsign || ac.icao} | ${ac.aircraftType || 'Unknown type'} | FL${Math.round(ac.altitude / 100)} | ${ac.speed}kts | HDG ${ac.heading}°`);
      }
    }
    lines.push('');
  } else {
    lines.push('=== AIR PICTURE ===');
    lines.push('No aircraft tracked in the reporting period.');
    lines.push('');
  }

  // Maritime summary
  if (ctx.vessels.length > 0) {
    const milVessels = ctx.vessels.filter(v => ['military', 'law-enforcement', 'coast-guard'].includes(v.classification));
    const civVessels = ctx.vessels.filter(v => !['military', 'law-enforcement', 'coast-guard'].includes(v.classification));

    lines.push(`=== MARITIME PICTURE (${ctx.vessels.length} tracked) ===`);
    lines.push(`Naval/military: ${milVessels.length} | Civilian: ${civVessels.length}`);

    if (milVessels.length > 0) {
      lines.push('Military/naval vessels:');
      for (const v of milVessels.slice(0, 10)) {
        lines.push(`- ${v.name || v.mmsi} | ${v.classification} | ${v.speed.toFixed(1)}kts | HDG ${v.heading}° | ${v.destination || 'no destination'}`);
      }
    }
    lines.push('');
  } else {
    lines.push('=== MARITIME PICTURE ===');
    lines.push('No vessels tracked in the reporting period.');
    lines.push('');
  }

  lines.push('Generate the SITREP now based on the data above.');

  return lines.join('\n');
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
