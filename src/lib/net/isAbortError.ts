/** True when `error` is an abort/timeout (e.g. `fetch` with `AbortSignal.timeout`). */
export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'AbortError') {
    return true;
  }
  return false;
}
