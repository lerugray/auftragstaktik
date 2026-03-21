import { cacheGet, cacheSet } from './cache';

const CACHE_KEY = 'deepstate-frontlines';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const LIVE_API_URL = 'https://deepstatemap.live/api/history/last';
const GITHUB_FALLBACK_BASE =
  'https://raw.githubusercontent.com/cyterat/deepstate-map-data/main/data/deepstatemap_data_';

interface DeepStateGeoJSON {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: Record<string, unknown>;
    geometry: {
      type: 'Polygon' | 'MultiPolygon';
      coordinates: number[][][] | number[][][][];
    };
  }>;
}

function getGitHubFallbackUrl(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${GITHUB_FALLBACK_BASE}${year}${month}${day}.geojson`;
}

function classifyFeature(properties: Record<string, unknown>): {
  status: string;
  fillColor: string;
  strokeColor: string;
} {
  const name = (properties.name as string) || '';

  if (name.includes('Occupied') || name.includes('Окуповано')) {
    return { status: 'occupied', fillColor: '#a52714', strokeColor: '#d93025' };
  }
  if (name.includes('Unknown') || name.includes('невідомий')) {
    return { status: 'contested', fillColor: '#bcaaa4', strokeColor: '#8d6e63' };
  }
  if (name.includes('Transnistria') || name.includes('Придністров')) {
    return { status: 'transnistria', fillColor: '#7b1fa2', strokeColor: '#9c27b0' };
  }
  // Russian military unit deployment zones
  if (name.includes('geoJSON.units') || name.includes('полк') || name.includes('бригад') ||
      name.includes('батальйон') || name.includes('корпус') || name.includes('дивіз') ||
      name.includes('regiment') || name.includes('brigade') || name.includes('battalion') ||
      name.includes('Corps') || name.includes('division')) {
    return { status: 'unit', fillColor: '#e65100', strokeColor: '#ff6d00' };
  }

  return { status: 'other', fillColor: '#ff6d00', strokeColor: '#ff9100' };
}

export async function fetchDeepStateData(): Promise<DeepStateGeoJSON> {
  const cached = cacheGet<DeepStateGeoJSON>(CACHE_KEY);
  if (cached) return cached;

  let data: DeepStateGeoJSON;

  try {
    // Try the live API first (richer data with status categories)
    const res = await fetch(LIVE_API_URL, {
      headers: { 'User-Agent': 'Auftragstaktik-OSINT/0.1' },
    });
    if (!res.ok) throw new Error(`Live API returned ${res.status}`);
    const json = await res.json();
    // Live API wraps the FeatureCollection under a "map" key
    data = json.map || json;
  } catch {
    // Fallback to GitHub daily file
    const fallbackUrl = getGitHubFallbackUrl();
    const res = await fetch(fallbackUrl);
    if (!res.ok) throw new Error(`GitHub fallback returned ${res.status}`);
    data = await res.json();
  }

  // Classify features and strip elevation from coordinates
  data.features = data.features.map((feature) => {
    const classification = classifyFeature(feature.properties);
    return {
      ...feature,
      properties: {
        ...feature.properties,
        ...classification,
      },
    };
  });

  cacheSet(CACHE_KEY, data, CACHE_TTL);
  return data;
}
