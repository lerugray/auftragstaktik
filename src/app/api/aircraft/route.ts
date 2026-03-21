import { NextRequest, NextResponse } from 'next/server';
import { fetchAircraftData } from '@/lib/data/adsb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const boundsStr = searchParams.get('bounds') || '22.0,44.0,40.5,52.5'; // Ukraine default
    const bounds = boundsStr.split(',').map(Number) as [number, number, number, number];

    const aircraft = await fetchAircraftData(bounds);
    return NextResponse.json({
      aircraft,
      count: aircraft.length,
      military: aircraft.filter((a) => a.military).length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Aircraft API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch aircraft data' },
      { status: 502 }
    );
  }
}
