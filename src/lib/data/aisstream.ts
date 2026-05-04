import { cacheGet, cacheSet } from './cache';
import type { MaritimeRecord, VesselClassification } from '@/lib/types/events';
import { spawn as nodeSpawn } from 'child_process';
import type { ChildProcess, SpawnOptions } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const CACHE_KEY = 'aisstream-vessels';
const CACHE_TTL = 90 * 1000; // 90 seconds

/** Max time to wait for one child run before kill (dangling WebSocket / stuck process). */
export const AISSTREAM_CHILD_HARD_TIMEOUT_MS = 60_000;
/** WebSocket open duration inside the collector script before graceful close. */
const INNER_WS_CLOSE_MS = 10_000;

const RETRY_BACKOFF_MS = [1_000, 2_000, 4_000] as const;
const MAX_RETRIES = 3;

export type SpawnFn = (
  command: string,
  args?: readonly string[],
  options?: SpawnOptions
) => ChildProcess;

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

function mergeByMmsi(a: MaritimeRecord[], b: MaritimeRecord[]): MaritimeRecord[] {
  const map = new Map<string, MaritimeRecord>();
  for (const v of a) map.set(v.mmsi, v);
  for (const v of b) map.set(v.mmsi, v);
  return Array.from(map.values());
}

let bgCollecting = false;
let storedVessels: MaritimeRecord[] = [];

export interface RunCollectorOptions {
  spawnFn?: SpawnFn;
  /** Override temp JSON path (tests). */
  resolveTmpFile?: () => string;
}

function mapRawToRecords(rawData: Record<string, unknown>[]): MaritimeRecord[] {
  return rawData.map((v) => ({
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
}

/**
 * One WebSocket collector child. Returns vessels and whether the run finished cleanly
 * (exit 0 + tmp file read). Otherwise callers may retry.
 */
export function runCollectorOnce(
  apiKey: string,
  bounds: number[][][],
  options?: RunCollectorOptions
): Promise<{ vessels: MaritimeRecord[]; cleanExit: boolean }> {
  const spawnFn = options?.spawnFn ?? nodeSpawn;
  return new Promise((resolve) => {
    const projectRoot = process.cwd();
    const tmpFile =
      options?.resolveTmpFile?.() ?? path.join(os.tmpdir(), `aisstream-${Date.now()}.json`);
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
setTimeout(function() { ws.close(); }, ${INNER_WS_CLOSE_MS});
`;

    fs.writeFileSync(scriptFile, script);

    const child = spawnFn(process.execPath, [scriptFile], {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let finished = false;
    const finish = (vessels: MaritimeRecord[], cleanExit: boolean) => {
      if (finished) return;
      finished = true;
      clearTimeout(hardKillTimer);
      resolve({ vessels, cleanExit });
    };

    const hardKillTimer = setTimeout(() => {
      try {
        child.kill();
      } catch {
        /* ignore */
      }
      console.error('aisstream: child timeout: 60s exceeded, killing');
      finish([], false);
    }, AISSTREAM_CHILD_HARD_TIMEOUT_MS);

    child.on('exit', (code) => {
      try {
        fs.unlinkSync(scriptFile);
      } catch {
        /* ignore */
      }

      if (finished) return;

      clearTimeout(hardKillTimer);

      try {
        if (fs.existsSync(tmpFile)) {
          const rawData = JSON.parse(fs.readFileSync(tmpFile, 'utf-8')) as Record<string, unknown>[];
          fs.unlinkSync(tmpFile);
          const vessels = mapRawToRecords(rawData);
          console.log(`aisstream: collected ${rawData.length} vessels`);
          finish(vessels, code === 0);
          return;
        }
      } catch (err) {
        console.error(
          'aisstream: read error:',
          err instanceof Error ? err.message : String(err)
        );
      }
      // No tmp file means the collector did not flush (disconnect / error path).
      finish([], false);
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runCollector(
  apiKey: string,
  bounds: number[][][],
  options?: RunCollectorOptions
): Promise<MaritimeRecord[]> {
  let accumulated: MaritimeRecord[] = [];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delayMs = RETRY_BACKOFF_MS[attempt - 1];
      console.error(
        `aisstream: disconnect, retrying in ${delayMs / 1000}s (attempt ${attempt}/${MAX_RETRIES})`
      );
      await sleep(delayMs);
    }

    const { vessels, cleanExit } = await runCollectorOnce(apiKey, bounds, options);
    accumulated = mergeByMmsi(accumulated, vessels);

    if (cleanExit) {
      return accumulated;
    }
  }

  return accumulated;
}

export async function fetchMaritimeData(
  bounds: [number, number, number, number],
  options?: RunCollectorOptions
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
  const vessels = await runCollector(apiKey, wsBounds, options);
  bgCollecting = false;

  storedVessels = vessels;
  cacheSet(CACHE_KEY, vessels, CACHE_TTL);
  return vessels;
}

export function getVesselStoreSize(): number {
  return storedVessels.length;
}
