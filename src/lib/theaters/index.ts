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
      { source: 'acled', enabled: true, params: { conflicts: ['ukraine'] } },
    ],
  },
  {
    id: 'middle-east',
    name: 'Middle East',
    bounds: [29.0, 22.0, 63.5, 40.0],
    center: [42.0, 32.0],
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
      { source: 'acled', enabled: true, params: { conflicts: ['israel', 'syria', 'yemen', 'iran'] } },
    ],
  },
];

export function getTheater(id: string): Theater | undefined {
  return theaters.find((t) => t.id === id);
}

export function getDefaultTheater(): Theater {
  return theaters[0];
}
