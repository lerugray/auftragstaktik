/**
 * Map-layer coordinate guards (auft-004).
 *
 * - safeLatLng: only accepts primitive `number` inputs (rejects strings/objects).
 *   Latitude must already lie in [-90, 90]; out-of-range lat is rejected (row
 *   dropped), not clamped, so bad upstream lat is not silently shown.
 *   Longitude is wrapped into (-180, 180] via {@link normalizeLng} so antimeridian
 *   / multi-revolution values from AIS and similar stay renderable.
 * - isValidLatLng: true iff safeLatLng would return a tuple (same rules).
 * - normalizeLng: wraps finite longitudes; returns NaN if the input is not a
 *   finite number (callers use safeLatLng for unknown-typed values).
 * - clampLat: clamps finite latitude to [-90, 90]; returns NaN if the input is
 *   not finite (does not coerce strings).
 */

export function normalizeLng(lng: number): number {
  if (!Number.isFinite(lng)) return NaN;
  const wrapped = ((lng + 180) % 360 + 360) % 360 - 180;
  // Canonicalize -180 to 180 so wrapped values like 540 land on 180, not -180.
  return wrapped === -180 ? 180 : wrapped;
}

export function clampLat(lat: number): number {
  if (!Number.isFinite(lat)) return NaN;
  return Math.min(90, Math.max(-90, lat));
}

export function isValidLatLng(lat: unknown, lng: unknown): boolean {
  return safeLatLng(lat, lng) !== null;
}

export function safeLatLng(lat: unknown, lng: unknown): [number, number] | null {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90) return null;
  const nLng = normalizeLng(lng);
  if (!Number.isFinite(nLng)) return null;
  return [lat, nLng];
}
