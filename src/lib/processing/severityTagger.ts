import type { Severity } from '@/lib/types/events';

export const severityOrder: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export const severityColors: Record<Severity, string> = {
  critical: '#ff2020',
  high: '#ff6b2b',
  medium: '#ffbf00',
  low: '#00cc33',
  info: '#00aaff',
};

export const severityLabels: Record<Severity, string> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
  info: 'INFO',
};

export function compareSeverity(a: Severity, b: Severity): number {
  return severityOrder[a] - severityOrder[b];
}
