import { cacheGet, cacheSet } from './cache';
import type { ACLEDRecord } from '@/lib/types/events';

const CACHE_KEY_PREFIX = 'acled';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const TOKEN_CACHE_KEY = 'acled-oauth-token';
const TOKEN_TTL = 23 * 60 * 60 * 1000; // 23 hours (tokens last 24h)

const ACLED_TOKEN_URL = 'https://acleddata.com/oauth/token';
const ACLED_API_URL = 'https://acleddata.com/api/acled/read';

interface ACLEDApiResponse {
  status: number;
  success: boolean;
  data: Array<{
    event_id_cnty: string;
    event_date: string;
    event_type: string;
    sub_event_type: string;
    actor1: string;
    actor2: string;
    country: string;
    admin1: string;
    admin2: string;
    location: string;
    latitude: string;
    longitude: string;
    fatalities: string;
    notes: string;
    source: string;
    source_scale: string;
  }>;
}

function getDaysAgoDate(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().split('T')[0];
}

async function getACLEDToken(): Promise<string> {
  const cached = cacheGet<string>(TOKEN_CACHE_KEY);
  if (cached) return cached;

  const email = process.env.ACLED_EMAIL;
  const password = process.env.ACLED_PASSWORD;

  if (!email || !password) {
    throw new Error('ACLED_EMAIL or ACLED_PASSWORD not set');
  }

  const res = await fetch(ACLED_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      username: email,
      password: password,
      grant_type: 'password',
      client_id: 'acled',
    }).toString(),
  });

  if (!res.ok) {
    throw new Error(`ACLED OAuth token request failed: ${res.status}`);
  }

  const json = await res.json();
  const token = json.access_token;
  if (!token) throw new Error('No access_token in ACLED OAuth response');

  cacheSet(TOKEN_CACHE_KEY, token, TOKEN_TTL);
  return token;
}

export async function fetchACLEDData(
  country: string,
  days: number = 7
): Promise<ACLEDRecord[]> {
  const cacheKey = `${CACHE_KEY_PREFIX}-${country}-${days}`;
  const cached = cacheGet<ACLEDRecord[]>(cacheKey);
  if (cached) return cached;

  const email = process.env.ACLED_EMAIL;
  const password = process.env.ACLED_PASSWORD;

  if (!email || !password) {
    console.warn('ACLED_EMAIL or ACLED_PASSWORD not set. Using demo data.');
    return getDemoData();
  }

  // Get OAuth token
  const token = await getACLEDToken();

  const startDate = getDaysAgoDate(days);
  const endDate = getDaysAgoDate(0);

  const params = new URLSearchParams({
    _format: 'json',
    country: country,
    event_date: `${startDate}|${endDate}`,
    event_date_where: 'BETWEEN',
    limit: '500',
  });

  const res = await fetch(`${ACLED_API_URL}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`ACLED API returned ${res.status}`);

  const json: ACLEDApiResponse = await res.json();
  if (!json.success || !json.data) {
    throw new Error('ACLED API returned unsuccessful response');
  }

  const records: ACLEDRecord[] = json.data.map((d) => ({
    eventId: d.event_id_cnty,
    eventDate: d.event_date,
    eventType: d.event_type,
    subEventType: d.sub_event_type,
    actor1: d.actor1,
    actor2: d.actor2 || undefined,
    country: d.country,
    admin1: d.admin1 || undefined,
    admin2: d.admin2 || undefined,
    location: d.location,
    latitude: parseFloat(d.latitude),
    longitude: parseFloat(d.longitude),
    fatalities: parseInt(d.fatalities, 10) || 0,
    notes: d.notes || undefined,
    source: d.source || undefined,
    sourceScale: d.source_scale || undefined,
  }));

  cacheSet(cacheKey, records, CACHE_TTL);
  return records;
}

// Demo data for when ACLED credentials aren't configured
function getDemoData(): ACLEDRecord[] {
  return [
    {
      eventId: 'demo-1',
      eventDate: new Date().toISOString().split('T')[0],
      eventType: 'Battles',
      subEventType: 'Armed clash',
      actor1: 'Military Forces of Russia',
      actor2: 'Military Forces of Ukraine',
      country: 'Ukraine',
      admin1: 'Donetsk',
      location: 'Pokrovsk',
      latitude: 48.2833,
      longitude: 37.1833,
      fatalities: 0,
      notes: 'Demo event: Armed clash reported near Pokrovsk',
    },
    {
      eventId: 'demo-2',
      eventDate: new Date().toISOString().split('T')[0],
      eventType: 'Explosions/Remote violence',
      subEventType: 'Shelling/artillery/missile attack',
      actor1: 'Military Forces of Russia',
      country: 'Ukraine',
      admin1: 'Kharkiv',
      location: 'Kharkiv',
      latitude: 49.9935,
      longitude: 36.2304,
      fatalities: 2,
      notes: 'Demo event: Shelling reported in Kharkiv city center',
    },
    {
      eventId: 'demo-3',
      eventDate: new Date().toISOString().split('T')[0],
      eventType: 'Explosions/Remote violence',
      subEventType: 'Air/drone strike',
      actor1: 'Military Forces of Russia',
      country: 'Ukraine',
      admin1: 'Zaporizhzhia',
      location: 'Zaporizhzhia',
      latitude: 47.8388,
      longitude: 35.1396,
      fatalities: 0,
      notes: 'Demo event: Drone strike reported in Zaporizhzhia oblast',
    },
    {
      eventId: 'demo-4',
      eventDate: getDaysAgoDate(1),
      eventType: 'Battles',
      subEventType: 'Armed clash',
      actor1: 'Military Forces of Russia',
      actor2: 'Military Forces of Ukraine',
      country: 'Ukraine',
      admin1: 'Donetsk',
      location: 'Chasiv Yar',
      latitude: 48.6,
      longitude: 37.85,
      fatalities: 0,
      notes: 'Demo event: Ongoing fighting near Chasiv Yar',
    },
    {
      eventId: 'demo-5',
      eventDate: getDaysAgoDate(1),
      eventType: 'Strategic developments',
      subEventType: 'Other',
      actor1: 'Military Forces of Ukraine',
      country: 'Ukraine',
      admin1: 'Kherson',
      location: 'Kherson',
      latitude: 46.6354,
      longitude: 32.6169,
      fatalities: 0,
      notes: 'Demo event: Ukrainian forces conduct operations in Kherson oblast',
    },
  ];
}
