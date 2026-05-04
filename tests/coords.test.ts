import { describe, expect, it } from 'vitest';
import { clampLat, isValidLatLng, normalizeLng, safeLatLng } from '@/lib/processing/coords';

describe('safeLatLng', () => {
  it('accepts mid-range coordinates', () => {
    expect(safeLatLng(40, -73)).toEqual([40, -73]);
  });

  it('accepts equator and prime meridian (0, 0)', () => {
    expect(safeLatLng(0, 0)).toEqual([0, 0]);
  });

  it('accepts latitude at poles and near-poles', () => {
    expect(safeLatLng(89.999, 0)).toEqual([89.999, 0]);
    expect(safeLatLng(90, 0)).toEqual([90, 0]);
    expect(safeLatLng(-90, 0)).toEqual([-90, 0]);
  });

  it('rejects latitude outside [-90, 90]', () => {
    expect(safeLatLng(90.001, 0)).toBeNull();
    expect(safeLatLng(-90.001, 0)).toBeNull();
  });

  it('preserves dateline-adjacent longitudes', () => {
    const nearLine = safeLatLng(0, 179.9);
    expect(nearLine).not.toBeNull();
    expect(nearLine![0]).toBe(0);
    expect(nearLine![1]).toBeCloseTo(179.9, 5);
    expect(safeLatLng(0, 180)).toEqual([0, 180]);
    expect(safeLatLng(0, -180)).toEqual([0, 180]);
  });

  it('wraps out-of-range longitude', () => {
    expect(safeLatLng(0, 270)).toEqual([0, -90]);
    expect(safeLatLng(0, -270)).toEqual([0, 90]);
    expect(safeLatLng(0, 540)).toEqual([0, 180]);
  });

  it('rejects NaN, Infinity, and -Infinity', () => {
    expect(safeLatLng(NaN, 0)).toBeNull();
    expect(safeLatLng(0, NaN)).toBeNull();
    expect(safeLatLng(Infinity, 0)).toBeNull();
    expect(safeLatLng(0, Infinity)).toBeNull();
    expect(safeLatLng(-Infinity, 0)).toBeNull();
    expect(safeLatLng(0, -Infinity)).toBeNull();
  });

  it('rejects undefined and null', () => {
    expect(safeLatLng(undefined, 0)).toBeNull();
    expect(safeLatLng(0, undefined)).toBeNull();
    expect(safeLatLng(null, 0)).toBeNull();
    expect(safeLatLng(0, null)).toBeNull();
  });

  it('rejects string inputs', () => {
    expect(safeLatLng('40' as unknown as number, -73)).toBeNull();
    expect(safeLatLng(40, 'abc' as unknown as number)).toBeNull();
  });
});

describe('normalizeLng', () => {
  it('leaves in-range longitude unchanged', () => {
    expect(normalizeLng(0)).toBe(0);
    expect(normalizeLng(-73.5)).toBe(-73.5);
  });

  it('returns NaN for non-finite input', () => {
    expect(Number.isNaN(normalizeLng(NaN))).toBe(true);
    expect(Number.isNaN(normalizeLng(Infinity))).toBe(true);
    expect(Number.isNaN(normalizeLng(-Infinity))).toBe(true);
  });

  it('wraps 270 to -90 and -270 to 90', () => {
    expect(normalizeLng(270)).toBe(-90);
    expect(normalizeLng(-270)).toBe(90);
  });

  it('canonicalizes full wraps to 180', () => {
    expect(normalizeLng(540)).toBe(180);
  });
});

describe('clampLat', () => {
  it('clamps to [-90, 90]', () => {
    expect(clampLat(95)).toBe(90);
    expect(clampLat(-100)).toBe(-90);
    expect(clampLat(0)).toBe(0);
  });

  it('returns NaN for non-finite input', () => {
    expect(Number.isNaN(clampLat(NaN))).toBe(true);
    expect(Number.isNaN(clampLat(Infinity))).toBe(true);
  });
});

describe('isValidLatLng', () => {
  it('matches safeLatLng acceptance', () => {
    expect(isValidLatLng(40, -73)).toBe(true);
    expect(isValidLatLng(0, 0)).toBe(true);
    expect(isValidLatLng(90.001, 0)).toBe(false);
    expect(isValidLatLng('40' as unknown as number, -73)).toBe(false);
    expect(isValidLatLng(0, NaN)).toBe(false);
  });
});
