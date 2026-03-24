export interface TheaterRegion {
  id: string;
  name: string;
  bounds: [number, number, number, number]; // [west, south, east, north]
}

export interface DataSourceConfig {
  source: string;
  enabled: boolean;
  params?: Record<string, unknown>;
}

export interface Theater {
  id: string;
  name: string;
  bounds: [number, number, number, number]; // [west, south, east, north]
  center: [number, number]; // [lng, lat]
  zoom: number;
  regions: TheaterRegion[];
  dataSources: DataSourceConfig[];
}

export const theaters: Theater[] = [
  {
    id: 'ukraine',
    name: 'Ukraine',
    bounds: [22.0, 44.0, 40.5, 52.5],
    center: [31.5, 48.5],
    zoom: 6,
    regions: [
      { id: 'donetsk', name: 'Donetsk Oblast', bounds: [36.5, 47.0, 39.0, 49.5] },
      { id: 'luhansk', name: 'Luhansk Oblast', bounds: [38.0, 48.0, 40.5, 50.0] },
      { id: 'zaporizhzhia', name: 'Zaporizhzhia Oblast', bounds: [34.0, 46.5, 37.0, 48.5] },
      { id: 'kherson', name: 'Kherson Oblast', bounds: [32.0, 46.0, 35.5, 47.5] },
      { id: 'kharkiv', name: 'Kharkiv Oblast', bounds: [35.0, 49.0, 38.0, 51.0] },
      { id: 'crimea', name: 'Crimea', bounds: [32.5, 44.3, 36.7, 46.3] },
      { id: 'black-sea', name: 'Black Sea', bounds: [27.0, 40.0, 42.0, 47.0] },
    ],
    dataSources: [
      { source: 'deepstate', enabled: true },
      { source: 'adsb', enabled: true, params: { bbox: [22.0, 44.0, 40.5, 52.5] } },
      { source: 'aisstream', enabled: true, params: { bbox: [27.0, 40.0, 42.0, 47.0] } },
      { source: 'geoconfirmed', enabled: true, params: { conflicts: ['ukraine'] } },
      { source: 'telegram', enabled: true, params: { channels: ['ryaborig', 'DeepStateUA', 'waboronzo'] } },
    ],
  },
  {
    id: 'middle-east',
    name: 'Middle East',
    bounds: [29.0, 12.0, 63.5, 40.0],
    center: [42.0, 30.0],
    zoom: 5,
    regions: [
      { id: 'israel-gaza', name: 'Israel / Gaza', bounds: [34.0, 29.5, 35.9, 33.3] },
      { id: 'lebanon', name: 'Lebanon', bounds: [35.0, 33.0, 36.7, 34.7] },
      { id: 'syria', name: 'Syria', bounds: [35.7, 32.3, 42.4, 37.3] },
      { id: 'iran', name: 'Iran', bounds: [44.0, 25.0, 63.5, 40.0] },
      { id: 'yemen', name: 'Yemen', bounds: [42.5, 12.0, 54.5, 19.0] },
      { id: 'persian-gulf', name: 'Persian Gulf', bounds: [48.0, 24.0, 56.5, 30.5] },
      { id: 'red-sea', name: 'Red Sea', bounds: [32.0, 12.0, 44.0, 30.0] },
      { id: 'hormuz', name: 'Strait of Hormuz', bounds: [54.0, 25.0, 58.0, 27.5] },
    ],
    dataSources: [
      { source: 'adsb', enabled: true, params: { bbox: [29.0, 12.0, 63.5, 40.0] } },
      { source: 'aisstream', enabled: true, params: { bbox: [32.0, 12.0, 62.0, 30.5] } },
      { source: 'geoconfirmed', enabled: true, params: { conflicts: ['israel', '7oct', 'syria', 'yemen', 'iran'] } },
    ],
  },
  {
    id: 'baltic',
    name: 'Baltic / N. Europe',
    bounds: [10.0, 53.0, 32.0, 72.0],
    center: [22.0, 60.0],
    zoom: 5,
    regions: [
      { id: 'kaliningrad', name: 'Kaliningrad', bounds: [19.5, 54.2, 22.9, 55.4] },
      { id: 'baltic-sea', name: 'Baltic Sea', bounds: [10.0, 53.5, 30.0, 66.0] },
      { id: 'finland-border', name: 'Finland / Russia Border', bounds: [25.0, 59.0, 32.0, 70.0] },
      { id: 'baltic-states', name: 'Baltic States', bounds: [20.5, 53.8, 28.5, 59.7] },
      { id: 'norway-coast', name: 'Norwegian Coast', bounds: [3.0, 58.0, 16.0, 72.0] },
    ],
    dataSources: [
      { source: 'adsb', enabled: true, params: { bbox: [10.0, 53.0, 32.0, 72.0] } },
      { source: 'aisstream', enabled: true, params: { bbox: [10.0, 53.0, 30.0, 66.0] } },
      { source: 'geoconfirmed', enabled: true, params: { conflicts: ['world'] } },
    ],
  },
  {
    id: 'east-asia',
    name: 'East Asia / Pacific',
    bounds: [100.0, 15.0, 145.0, 45.0],
    center: [125.0, 33.0],
    zoom: 4,
    regions: [
      { id: 'korean-peninsula', name: 'Korean Peninsula', bounds: [124.0, 33.0, 131.0, 43.5] },
      { id: 'taiwan-strait', name: 'Taiwan Strait', bounds: [116.0, 21.5, 123.0, 26.5] },
      { id: 'south-china-sea', name: 'South China Sea', bounds: [105.0, 15.0, 121.0, 25.0] },
      { id: 'east-china-sea', name: 'East China Sea', bounds: [120.0, 25.0, 132.0, 34.0] },
      { id: 'sea-of-japan', name: 'Sea of Japan', bounds: [127.0, 34.0, 142.0, 45.0] },
    ],
    dataSources: [
      { source: 'adsb', enabled: true, params: { bbox: [100.0, 15.0, 145.0, 45.0] } },
      { source: 'aisstream', enabled: true, params: { bbox: [100.0, 15.0, 145.0, 45.0] } },
      { source: 'geoconfirmed', enabled: true, params: { conflicts: ['pac'] } },
    ],
  },
  {
    id: 'africa',
    name: 'Africa',
    bounds: [-18.0, -5.0, 52.0, 38.0],
    center: [20.0, 15.0],
    zoom: 4,
    regions: [
      { id: 'sahel', name: 'Sahel', bounds: [-18.0, 10.0, 25.0, 25.0] },
      { id: 'horn-of-africa', name: 'Horn of Africa', bounds: [32.0, 0.0, 52.0, 18.0] },
      { id: 'sudan', name: 'Sudan', bounds: [21.8, 8.6, 38.6, 23.1] },
      { id: 'drc', name: 'DR Congo', bounds: [12.0, -13.5, 31.5, 5.5] },
      { id: 'libya', name: 'Libya', bounds: [9.0, 19.5, 25.2, 33.2] },
      { id: 'mozambique', name: 'Mozambique', bounds: [30.0, -27.0, 41.0, -10.0] },
    ],
    dataSources: [
      { source: 'adsb', enabled: true, params: { bbox: [-18.0, -5.0, 52.0, 38.0] } },
      { source: 'aisstream', enabled: true, params: { bbox: [-18.0, -5.0, 52.0, 30.0] } },
      { source: 'geoconfirmed', enabled: true, params: { conflicts: ['africa', 'drc'] } },
    ],
  },
  {
    id: 'myanmar',
    name: 'Myanmar',
    bounds: [92.0, 9.5, 101.5, 28.5],
    center: [96.5, 19.5],
    zoom: 6,
    regions: [
      { id: 'shan', name: 'Shan State', bounds: [96.0, 19.0, 101.5, 24.0] },
      { id: 'kachin', name: 'Kachin State', bounds: [96.0, 24.0, 99.0, 28.5] },
      { id: 'rakhine', name: 'Rakhine State', bounds: [92.0, 17.5, 95.0, 21.5] },
      { id: 'sagaing', name: 'Sagaing Region', bounds: [93.5, 19.5, 97.5, 26.0] },
    ],
    dataSources: [
      { source: 'adsb', enabled: true, params: { bbox: [92.0, 9.5, 101.5, 28.5] } },
      { source: 'aisstream', enabled: true, params: { bbox: [92.0, 9.5, 101.0, 20.0] } },
      { source: 'geoconfirmed', enabled: true, params: { conflicts: ['myanmar'] } },
    ],
  },
];

export function getTheater(id: string): Theater | undefined {
  return theaters.find((t) => t.id === id);
}

export function getDefaultTheater(): Theater {
  return theaters[0];
}
