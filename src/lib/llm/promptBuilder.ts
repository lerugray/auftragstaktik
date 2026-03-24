import type { EventRecord, AircraftRecord, MaritimeRecord } from '@/lib/types/events';
import {
  groupByLocation,
  aggregateFactions,
  aggregateEquipmentLosses,
  clusterByTime,
  pickTopDescriptions,
  pickTelegramExcerpts,
} from './eventAggregator';

export const ANALYST_SYSTEM_PROMPT = `You are a military intelligence analyst producing a SITREP (Situation Report) based on open-source intelligence (OSINT) data. Write in terse, professional military style. Use standard military terminology and abbreviations. No filler, no speculation beyond what the data supports. State facts, identify patterns, assess implications.

Source reliability is indicated in the data. Weight GeoConfirmed events (geolocated, visually verified) higher than Telegram reports (unconfirmed OSINT) in your assessment.

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

  // === ENRICHED EVENTS SECTION ===
  if (ctx.events.length > 0) {
    lines.push(`=== CONFLICT EVENTS (${ctx.events.length} total) ===`);
    lines.push('');

    // Location summary
    const locationGroups = groupByLocation(ctx.events);
    lines.push('LOCATION SUMMARY:');
    const sortedLocations = [...locationGroups.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 8);

    for (const [location, locEvents] of sortedLocations) {
      const typeCounts = new Map<string, number>();
      for (const e of locEvents) {
        const t = e.eventType.replace(/\s*\[.*\]$/, '');
        typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
      }
      const typeStr = [...typeCounts.entries()].map(([t, c]) => `${c} ${t}`).join(', ');
      lines.push(`- ${location}: ${locEvents.length} events (${typeStr})`);
    }
    lines.push('');

    // Faction breakdown
    const factions = aggregateFactions(ctx.events);
    lines.push(`FACTION BREAKDOWN:`);
    lines.push(`Hostile: ${factions.hostile} events | Friendly: ${factions.friendly} events | Unknown: ${factions.unknown} events`);
    lines.push('');

    // Equipment losses
    const losses = aggregateEquipmentLosses(ctx.events);
    if (losses.size > 0) {
      lines.push('CONFIRMED EQUIPMENT LOSSES:');
      const lossStr = [...losses.entries()].map(([type, count]) => `${count}x ${type}`).join(', ');
      lines.push(lossStr);
      lines.push('');
    }

    // Temporal clusters
    const clusters = clusterByTime(ctx.events);
    if (clusters.length > 0) {
      lines.push('NOTABLE ACTIVITY CLUSTERS:');
      for (const c of clusters.slice(0, 3)) {
        const start = c.startTime.substring(11, 16) + 'Z';
        const end = c.endTime.substring(11, 16) + 'Z';
        lines.push(`- ${c.location}: ${c.count} events ${start}-${end} (${c.types.join(', ')})`);
      }
      lines.push('');
    }

    // Top intelligence from verified sources
    const topIntel = pickTopDescriptions(ctx.events);
    if (topIntel.length > 0) {
      lines.push('TOP INTELLIGENCE (GeoConfirmed, verified):');
      for (const item of topIntel) {
        lines.push(`- [${item.severity}] ${item.timestamp}: "${item.description}"`);
      }
      lines.push('');
    }

    // Telegram excerpts
    const tgExcerpts = pickTelegramExcerpts(ctx.events);
    if (tgExcerpts.length > 0) {
      lines.push('TELEGRAM REPORTS (unconfirmed OSINT):');
      for (const item of tgExcerpts) {
        lines.push(`- @${item.channel} ${item.timestamp}: "${item.text}"`);
      }
      lines.push('');
    }

    // Source reliability note
    const geoconCount = ctx.events.filter(e => e.source === 'geoconfirmed').length;
    const tgramCount = ctx.events.filter(e => e.source === 'telegram').length;
    if (geoconCount > 0 || tgramCount > 0) {
      lines.push('SOURCE RELIABILITY:');
      if (geoconCount > 0) lines.push(`- GeoConfirmed (${geoconCount} events): Geolocated, visually verified`);
      if (tgramCount > 0) lines.push(`- Telegram (${tgramCount} events): Unverified OSINT, treat as unconfirmed`);
      lines.push('');
    }
  } else {
    lines.push('=== CONFLICT EVENTS ===');
    lines.push('No conflict events in the reporting period.');
    lines.push('');
  }

  // Aircraft summary (kept concise)
  if (ctx.aircraft.length > 0) {
    const milAircraft = ctx.aircraft.filter(a => a.military);
    const civAircraft = ctx.aircraft.filter(a => !a.military);

    lines.push(`=== AIR PICTURE (${ctx.aircraft.length} tracked) ===`);
    lines.push(`Military: ${milAircraft.length} | Civilian: ${civAircraft.length}`);

    if (milAircraft.length > 0) {
      lines.push('Military aircraft:');
      for (const ac of milAircraft.slice(0, 10)) {
        lines.push(`- ${ac.callsign || ac.icao} | ${ac.aircraftType || 'Unknown type'} | FL${Math.round(ac.altitude / 100)} | ${ac.speed}kts | HDG ${ac.heading}°`);
      }
    }
    lines.push('');
  } else {
    lines.push('=== AIR PICTURE ===');
    lines.push('No aircraft tracked in the reporting period.');
    lines.push('');
  }

  // Maritime summary (kept concise)
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
