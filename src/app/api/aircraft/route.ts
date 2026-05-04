import { NextRequest, NextResponse } from 'next/server';
import { fetchAircraftData } from '@/lib/data/adsb';
import { AdsbAircraftSchema } from '@/lib/data/schemas';
import { isAbortError } from '@/lib/net/isAbortError';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const boundsStr = searchParams.get('bounds') || '22.0,44.0,40.5,52.5'; // Ukraine default
    const bounds = boundsStr.split(',').map(Number) as [number, number, number, number];

    const aircraftRaw = await fetchAircraftData(bounds, AbortSignal.timeout(10_000));
    const aircraftParsed = AdsbAircraftSchema.array().safeParse(aircraftRaw);
    const aircraft = aircraftParsed.success ? aircraftParsed.data : [];
    if (!aircraftParsed.success) {
      console.error('upstream:adsb validation failed:', aircraftParsed.error.issues.slice(0, 5));
    }
    return NextResponse.json({
      aircraft,
      count: aircraft.length,
      military: aircraft.filter((a) => a.military).length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (isAbortError(error)) {
      console.error('upstream:adsb timeout: 10s exceeded');
      return NextResponse.json({
        aircraft: [],
        count: 0,
        military: 0,
        timestamp: new Date().toISOString(),
      });
    }
    console.error('Aircraft API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch aircraft data' },
      { status: 502 }
    );
  }
}
