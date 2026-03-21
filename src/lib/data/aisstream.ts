import { cacheGet, cacheSet } from './cache';
import type { MaritimeRecord, VesselClassification } from '@/lib/types/events';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const CACHE_KEY = 'aisstream-vessels';
const CACHE_TTL = 90 * 1000; // 90 seconds

function classifyVessel(vesselType: number, mmsi: string): VesselClassification {
  if (vesselType === 35) return 'military';
  if (vesselType === 55) return 'law-enforcement';
  if (vesselType === 58) return 'coast-guard';
  if (vesselType >= 50 && vesselType <= 59) return 'auxiliary';
  if (vesselType === 30) return 'fishing';
  if (vesselType >= 60 && vesselType <= 89) return 'merchant';
  if (mmsi.startsWith('273') && vesselType === 0) return 'unknown';
  return vesselType > 0 ? 'merchant' : 'unknown';
}

let bgCollecting = false;
let storedVessels: MaritimeRecord[] = [];

function runCollector(apiKey: string, bounds: number[][]): Promise<MaritimeRecord[]> {
  return new Promise((resolve) => {
    const projectRoot = process.cwd();
    const tmpFile = path.join(os.tmpdir(), `aisstream-${Date.now()}.json`);
    const scriptFile = path.join(projectRoot, '.aisstream-collector.js');

    const script = `
var WebSocket = require('ws');
var fs = require('fs');
var vessels = {};
var ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
ws.on('open', function() {
  ws.send(JSON.stringify({ APIKey: '${apiKey}', BoundingBoxes: ${JSON.stringify(bounds)} }));
});
ws.on('message', function(data) {
  try {
    var msg = JSON.parse(data.toString());
    var meta = msg.MetaData;
    if (!meta || !meta.latitude || !meta.longitude) return;
    var mmsi = String(meta.MMSI);
    var pos = msg.Message && msg.Message.PositionReport;
    var sd = msg.Message && msg.Message.ShipStaticData;
    var ex = vessels[mmsi] || {};
    vessels[mmsi] = {
      mmsi: mmsi,
      name: (meta.ShipName || '').trim() || ex.name || mmsi,
      vesselType: (sd && sd.Type != null) ? sd.Type : (ex.vesselType || 0),
      latitude: pos ? pos.Latitude : meta.latitude,
      longitude: pos ? pos.Longitude : meta.longitude,
      speed: pos ? (pos.Sog || 0) : (ex.speed || 0),
      heading: pos ? (pos.TrueHeading || 0) : (ex.heading || 0),
      course: pos ? pos.Cog : ex.course,
      destination: ((sd && sd.Destination) || '').trim() || ex.destination || '',
      callsign: ((sd && sd.CallSign) || '').trim() || ex.callsign || '',
      imo: (sd && sd.ImoNumber) ? String(sd.ImoNumber) : (ex.imo || ''),
      timestamp: meta.time_utc || new Date().toISOString()
    };
  } catch(e) {}
});
ws.on('close', function() {
  fs.writeFileSync('${tmpFile.replace(/\\/g, '/')}', JSON.stringify(Object.values(vessels)));
  process.exit(0);
});
ws.on('error', function() { process.exit(1); });
setTimeout(function() { ws.close(); }, 10000);
`;

    fs.writeFileSync(scriptFile, script);

    const child = spawn(process.execPath, [scriptFile], {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    child.on('exit', () => {
      try { fs.unlinkSync(scriptFile); } catch {}

      try {
        if (fs.existsSync(tmpFile)) {
          const rawData = JSON.parse(fs.readFileSync(tmpFile, 'utf-8'));
          fs.unlinkSync(tmpFile);
          console.log(`AISStream: collected ${rawData.length} vessels`);

          const vessels: MaritimeRecord[] = rawData.map((v: Record<string, unknown>) => ({
            mmsi: v.mmsi as string,
            name: v.name as string,
            vesselType: v.vesselType as number,
            classification: classifyVessel(v.vesselType as number, v.mmsi as string),
            latitude: v.latitude as number,
            longitude: v.longitude as number,
            speed: v.speed as number,
            heading: v.heading as number,
            course: v.course as number | undefined,
            destination: (v.destination as string) || undefined,
            callsign: (v.callsign as string) || undefined,
            imo: (v.imo as string) || undefined,
            flag: undefined,
            shipClass: undefined,
            timestamp: v.timestamp as string,
          }));

          resolve(vessels);
          return;
        }
      } catch (err) {
        console.error('AISStream read error:', (err as Error).message);
      }
      resolve([]);
    });

    // Safety timeout
    setTimeout(() => {
      try { child.kill(); } catch {}
      resolve([]);
    }, 18000);
  });
}

export async function fetchMaritimeData(
  bounds: [number, number, number, number]
): Promise<MaritimeRecord[]> {
  const cached = cacheGet<MaritimeRecord[]>(CACHE_KEY);
  if (cached) return cached;

  const apiKey = process.env.AISSTREAM_API_KEY;
  if (!apiKey) return [];

  // If already collecting in background, return whatever we have
  if (bgCollecting) return storedVessels;

  // Convert bounds [west, south, east, north] to [[lat_min, lon_min], [lat_max, lon_max]]
  // aisstream expects BoundingBoxes as array of [[[lat_min, lon_min], [lat_max, lon_max]]]
  const wsBounds = [[[bounds[1], bounds[0]], [bounds[3], bounds[2]]]];

  bgCollecting = true;
  const vessels = await runCollector(apiKey, wsBounds);
  bgCollecting = false;

  storedVessels = vessels;
  cacheSet(CACHE_KEY, vessels, CACHE_TTL);
  return vessels;
}

export function getVesselStoreSize(): number {
  return storedVessels.length;
}
