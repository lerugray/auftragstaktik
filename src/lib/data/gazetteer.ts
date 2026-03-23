// Known conflict-zone place names → coordinates for geo-tagging Telegram posts
// When a post mentions a location, we can plot it on the map

interface GazetteerEntry {
  name: string;
  aliases: string[];
  lat: number;
  lng: number;
}

const LOCATIONS: GazetteerEntry[] = [
  // Ukraine — major frontline cities and regions
  { name: 'Bakhmut', aliases: ['Бахмут', 'Артемовск', 'Artemovsk'], lat: 48.595, lng: 38.001 },
  { name: 'Avdiivka', aliases: ['Авдіївка', 'Авдеевка'], lat: 48.139, lng: 37.748 },
  { name: 'Pokrovsk', aliases: ['Покровськ', 'Покровск'], lat: 48.286, lng: 37.175 },
  { name: 'Vuhledar', aliases: ['Вугледар', 'Угледар'], lat: 47.784, lng: 37.255 },
  { name: 'Toretsk', aliases: ['Торецьк', 'Торецк'], lat: 48.393, lng: 37.847 },
  { name: 'Chasiv Yar', aliases: ['Часів Яр', 'Часов Яр'], lat: 48.599, lng: 37.848 },
  { name: 'Kupiansk', aliases: ['Купʼянськ', 'Купянск'], lat: 49.714, lng: 37.610 },
  { name: 'Lyman', aliases: ['Лиман'], lat: 48.983, lng: 37.803 },
  { name: 'Kherson', aliases: ['Херсон'], lat: 46.636, lng: 32.617 },
  { name: 'Zaporizhzhia', aliases: ['Запоріжжя', 'Запорожье'], lat: 47.839, lng: 35.140 },
  { name: 'Kharkiv', aliases: ['Харків', 'Харьков'], lat: 49.993, lng: 36.231 },
  { name: 'Odesa', aliases: ['Одеса', 'Одесса', 'Odessa'], lat: 46.483, lng: 30.713 },
  { name: 'Kyiv', aliases: ['Київ', 'Киев', 'Kiev'], lat: 50.450, lng: 30.524 },
  { name: 'Donetsk', aliases: ['Донецьк', 'Донецк'], lat: 48.016, lng: 37.804 },
  { name: 'Luhansk', aliases: ['Луганськ', 'Луганск'], lat: 48.574, lng: 39.308 },
  { name: 'Mariupol', aliases: ['Маріуполь', 'Мариуполь'], lat: 47.097, lng: 37.556 },
  { name: 'Crimea', aliases: ['Крим', 'Крым'], lat: 45.350, lng: 34.500 },
  { name: 'Sevastopol', aliases: ['Севастополь'], lat: 44.617, lng: 33.525 },
  { name: 'Kursk', aliases: ['Курск'], lat: 51.731, lng: 36.193 },
  { name: 'Belgorod', aliases: ['Белгород'], lat: 50.596, lng: 36.588 },
  { name: 'Sumy', aliases: ['Суми', 'Сумы'], lat: 50.907, lng: 34.798 },

  // Middle East
  { name: 'Gaza', aliases: ['غزة', 'Gaza City'], lat: 31.502, lng: 34.467 },
  { name: 'Rafah', aliases: ['رفح'], lat: 31.298, lng: 34.255 },
  { name: 'Khan Younis', aliases: ['خان يونس'], lat: 31.346, lng: 34.306 },
  { name: 'Beirut', aliases: ['بيروت'], lat: 33.889, lng: 35.495 },
  { name: 'Damascus', aliases: ['دمشق'], lat: 33.513, lng: 36.292 },
  { name: 'Aleppo', aliases: ['حلب'], lat: 36.202, lng: 37.132 },
  { name: 'Tehran', aliases: ['تهران'], lat: 35.689, lng: 51.389 },
  { name: 'Isfahan', aliases: ['اصفهان', 'Esfahan'], lat: 32.652, lng: 51.676 },
  { name: 'Sanaa', aliases: ['صنعاء', "Sana'a"], lat: 15.355, lng: 44.207 },
  { name: 'Hodeidah', aliases: ['الحديدة', 'Hodeida'], lat: 14.798, lng: 42.954 },

  // Myanmar
  { name: 'Mandalay', aliases: ['မန္တလေး'], lat: 21.975, lng: 96.084 },
  { name: 'Lashio', aliases: ['လားရှိုး'], lat: 22.934, lng: 97.750 },
  { name: 'Myitkyina', aliases: ['မြစ်ကြီးနား'], lat: 25.384, lng: 97.397 },
  { name: 'Sittwe', aliases: ['စစ်တွေ'], lat: 20.147, lng: 92.872 },
];

export interface GeoMatch {
  name: string;
  lat: number;
  lng: number;
}

export function geoTagText(text: string): GeoMatch | null {
  const lowerText = text.toLowerCase();

  for (const loc of LOCATIONS) {
    // Check primary name
    if (lowerText.includes(loc.name.toLowerCase())) {
      return { name: loc.name, lat: loc.lat, lng: loc.lng };
    }
    // Check aliases (including Cyrillic, Arabic, etc.)
    for (const alias of loc.aliases) {
      if (text.includes(alias) || lowerText.includes(alias.toLowerCase())) {
        return { name: loc.name, lat: loc.lat, lng: loc.lng };
      }
    }
  }

  return null;
}

// Haversine distance in km between two points
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Reverse lookup: find nearest named location within radius
export function reverseGeoLookup(lat: number, lng: number, radiusKm: number = 25): string | null {
  let nearest: string | null = null;
  let nearestDist = Infinity;

  for (const loc of LOCATIONS) {
    const dist = haversineKm(lat, lng, loc.lat, loc.lng);
    if (dist < radiusKm && dist < nearestDist) {
      nearest = loc.name;
      nearestDist = dist;
    }
  }

  return nearest;
}
