import { NextResponse } from 'next/server';
import { fetchDeepStateData } from '@/lib/data/deepstate';

export async function GET() {
  try {
    const data = await fetchDeepStateData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('DeepState API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch frontline data' },
      { status: 502 }
    );
  }
}
