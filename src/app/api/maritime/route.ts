import { NextRequest, NextResponse } from 'next/server';
import { fetchMaritimeData, getVesselStoreSize } from '@/lib/data/aisstream';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const boundsStr = searchParams.get('bounds') || '27.0,40.0,42.0,47.0'; // Black Sea default
    const bounds = boundsStr.split(',').map(Number) as [number, number, number, number];
    const filter = searchParams.get('filter') || 'all'; // all | naval | flagged

    let vessels = await fetchMaritimeData(bounds);

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
