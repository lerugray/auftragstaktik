import { describe, expect, it } from 'vitest';
import type { Severity } from '@/lib/types/events';
import {
  compareSeverity,
  isCBRNEvent,
  severityColors,
  severityLabels,
  severityOrder,
} from '@/lib/processing/severityTagger';

describe('severityTagger', () => {
  it('orders severities critical < high < medium < low < info via compareSeverity', () => {
    const chain: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
    for (let i = 0; i < chain.length - 1; i++) {
      expect(compareSeverity(chain[i], chain[i + 1])).toBeLessThan(0);
      expect(compareSeverity(chain[i + 1], chain[i])).toBeGreaterThan(0);
    }
    expect(compareSeverity('medium', 'medium')).toBe(0);
  });

  it('exposes aligned severityOrder, labels, and colors keys', () => {
    const keys: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
    for (const k of keys) {
      expect(severityOrder[k]).toBeTypeOf('number');
      expect(severityLabels[k].length).toBeGreaterThan(0);
      expect(severityColors[k].startsWith('#')).toBe(true);
    }
  });

  it('detects CBRN-related keywords from the pattern', () => {
    expect(isCBRNEvent('Reported nuclear test')).toBe(true);
    expect(isCBRNEvent('Possible dirty bomb')).toBe(true);
    expect(isCBRNEvent('Sarin exposure')).toBe(true);
    expect(isCBRNEvent('CBRN exercise in the region')).toBe(true);
  });

  it('returns false for ordinary military event text', () => {
    expect(isCBRNEvent('Tank battle near the river')).toBe(false);
    expect(isCBRNEvent('Artillery duel, no casualties')).toBe(false);
    expect(isCBRNEvent('Infantry movement observed')).toBe(false);
  });
});
