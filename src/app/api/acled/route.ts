import { NextRequest, NextResponse } from 'next/server';
import { fetchACLEDData } from '@/lib/data/acled';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const country = searchParams.get('country') || 'Ukraine';
    const days = parseInt(searchParams.get('days') || '7', 10);

    const data = await fetchACLEDData(country, days);
    return NextResponse.json({ events: data, count: data.length });
  } catch (error) {
    console.error('ACLED API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conflict event data' },
      { status: 502 }
    );
  }
}
