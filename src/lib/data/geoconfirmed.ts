import { cacheGet, cacheSet } from './cache';

const CACHE_KEY_PREFIX = 'geoconfirmed';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const API_BASE = 'https://geoconfirmed.org/api';

// Icon color hex → faction mapping
// GeoConfirmed uses consistent color codes across conflicts:
// Blue = defending/friendly side, Red = attacking/hostile side, Brown = unknown/other
const FACTION_MAP: Record<string, { faction: string; side: string }> = {
  '0051CA': { faction: 'Defending', side: 'friendly' },
  '0000FF': { faction: 'Defending', side: 'friendly' },
  'E00000': { faction: 'Attacking', side: 'hostile' },
  'FF0000': { faction: 'Attacking', side: 'hostile' },
  'AC7339': { faction: 'Unknown/Other', side: 'unknown' },
  '808080': { faction: 'Unknown/Other', side: 'unknown' },
};

// Icon filename number → event type mapping (common ones)
const ICON_TYPE_MAP: Record<string, string> = {
  '10': 'Explosion/Strike',
  '50': 'Artillery/Shelling',
  '92': 'Missile strike',
  '93': 'Drone strike',
  '192': 'Fire/Smoke',
  '30': 'Vehicle destroyed',
  '31': 'Tank destroyed',
  '32': 'APC/IFV destroyed',
  '40': 'Aircraft',
  '60': 'Naval',
  '70': 'Fortification',
  '80': 'Troops',
};

export interface GeoConfirmedEvent {
  id: string;
  date: string;
  latitude: number;
  longitude: number;
  faction: string;
  side: string;
  eventType: string;
  destroyed: boolean;
  iconUrl: string;
}

function parseIcon(iconPath: string): { faction: string; side: string; eventType: string; destroyed: boolean } {
  // Icon format: /icons/{COLOR_HEX}/{Destroyed}/icons/transparent/{TYPE_NUMBER}.png
  const parts = iconPath.split('/');
  const colorHex = parts[2] || '';
  const destroyed = parts[3] === 'True';
  const typeFile = parts[parts.length - 1] || '';
  const typeNumber = typeFile.replace('.png', '');

  const factionInfo = FACTION_MAP[colorHex] || { faction: 'Unknown', side: 'unknown' };
  const eventType = ICON_TYPE_MAP[typeNumber] || 'Conflict event';

  return {
    ...factionInfo,
    eventType,
    destroyed,
  };
}

export async function fetchGeoConfirmedEvents(
  conflict: string = 'Ukraine',
  pages: number = 5,
  perPage: number = 50
): Promise<GeoConfirmedEvent[]> {
  const cacheKey = `${CACHE_KEY_PREFIX}-${conflict}-${pages}`;
  const cached = cacheGet<GeoConfirmedEvent[]>(cacheKey);
  if (cached) return cached;

  const allEvents: GeoConfirmedEvent[] = [];

  for (let page = 1; page <= pages; page++) {
    try {
      const res = await fetch(`${API_BASE}/Placemark/${conflict}/${page}/${perPage}`);
      if (!res.ok) break;
      const json = await res.json();

      if (!json.items || json.items.length === 0) break;

      for (const item of json.items) {
        const iconInfo = parseIcon(item.icon || '');
        allEvents.push({
          id: item.id,
          date: item.date,
          latitude: item.la,
          longitude: item.lo,
          faction: iconInfo.faction,
          side: iconInfo.side,
          eventType: iconInfo.eventType,
          destroyed: iconInfo.destroyed,
          iconUrl: item.icon,
        });
      }
    } catch (err) {
      console.error(`GeoConfirmed page ${page} fetch error:`, err);
      break;
    }
  }

  cacheSet(cacheKey, allEvents, CACHE_TTL);
  return allEvents;
}
