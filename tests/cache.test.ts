import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cacheClear, cacheGet, cacheSet } from '@/lib/data/cache';

describe('cache', () => {
  beforeEach(() => {
    cacheClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    cacheClear();
  });

  it('returns data after cacheSet and cacheGet', () => {
    cacheSet('alpha', { x: 1 }, 60_000);
    expect(cacheGet<{ x: number }>('alpha')).toEqual({ x: 1 });
  });

  it('returns null for unknown keys', () => {
    expect(cacheGet('missing')).toBeNull();
  });

  it('does not collide across different keys', () => {
    cacheSet('k1', 'one', 60_000);
    cacheSet('k2', 'two', 60_000);
    expect(cacheGet<string>('k1')).toBe('one');
    expect(cacheGet<string>('k2')).toBe('two');
  });

  it('returns null after TTL when using fake timers', () => {
    vi.useFakeTimers({ now: new Date('2025-01-01T00:00:00.000Z') });
    cacheSet('ttl-key', { v: true }, 10_000);
    expect(cacheGet<{ v: boolean }>('ttl-key')).toEqual({ v: true });
    vi.advanceTimersByTime(10_001);
    expect(cacheGet('ttl-key')).toBeNull();
  });
});
