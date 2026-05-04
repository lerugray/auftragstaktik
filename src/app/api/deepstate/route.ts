import { NextResponse } from 'next/server';
import { fetchDeepStateData } from '@/lib/data/deepstate';
import { DeepStateFrontlineSchema } from '@/lib/data/schemas';
import { isAbortError } from '@/lib/net/isAbortError';

const EMPTY_DEEPSTATE = { type: 'FeatureCollection' as const, features: [] as const };

export async function GET() {
  try {
    const data = await fetchDeepStateData(AbortSignal.timeout(10_000));
    const parsed = DeepStateFrontlineSchema.safeParse(data);
    if (!parsed.success) {
      console.error('upstream:deepstate validation failed:', parsed.error.issues.slice(0, 5));
      return NextResponse.json(EMPTY_DEEPSTATE);
    }
    return NextResponse.json(parsed.data);
  } catch (error) {
    if (isAbortError(error)) {
      console.error('upstream:deepstate timeout: 10s exceeded');
      return NextResponse.json(EMPTY_DEEPSTATE);
    }
    console.error('DeepState API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch frontline data' },
      { status: 502 }
    );
  }
}
