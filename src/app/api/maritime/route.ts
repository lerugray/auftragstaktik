import { NextRequest, NextResponse } from 'next/server';
import { fetchMaritimeData, getVesselStoreSize } from '@/lib/data/aisstream';
import { AisstreamMaritimeSchema } from '@/lib/data/schemas';
import { isAbortError } from '@/lib/net/isAbortError';

/** Maritime collector uses WebSocket, not `fetch`; same 10s SLA as other upstream routes. */
function raceUpstreamTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      reject(new DOMException('The operation was aborted due to timeout', 'AbortError'));
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      }
    );
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const boundsStr = searchParams.get('bounds') || '27.0,40.0,42.0,47.0'; // Black Sea default
    const bounds = boundsStr.split(',').map(Number) as [number, number, number, number];
    const filter = searchParams.get('filter') || 'all'; // all | naval | flagged

    let vesselsRaw: Awaited<ReturnType<typeof fetchMaritimeData>>;
    try {
      vesselsRaw = await raceUpstreamTimeout(fetchMaritimeData(bounds), 10_000);
    } catch (e) {
      if (isAbortError(e)) {
        console.error('upstream:aisstream timeout: 10s exceeded');
        vesselsRaw = [];
      } else {
        throw e;
      }
    }
    const vesselsParsed = AisstreamMaritimeSchema.array().safeParse(vesselsRaw);
    let vessels = vesselsParsed.success ? vesselsParsed.data : [];
    if (!vesselsParsed.success) {
      console.error('upstream:aisstream validation failed:', vesselsParsed.error.issues.slice(0, 5));
    }

    if (filter === 'naval') {
      vessels = vessels.filter((v) =>
        ['military', 'law-enforcement', 'coast-guard'].includes(v.classification)
      );
    } else if (filter === 'flagged') {
      vessels = vessels.filter((v) =>
        v.classification !== 'merchant' && v.classification !== 'unknown'
      );
    }

    return NextResponse.json({
      vessels,
      count: vessels.length,
      military: vessels.filter((v) => v.classification === 'military').length,
      storeSize: getVesselStoreSize(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Maritime API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maritime data' },
      { status: 502 }
    );
  }
}
