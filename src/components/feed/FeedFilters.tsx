'use client';

import type { EventSource, Severity } from '@/lib/types/events';

interface FeedFiltersProps {
  activeSources: EventSource[];
  activeSeverities: Severity[];
  onToggleSource: (source: EventSource) => void;
  onToggleSeverity: (severity: Severity) => void;
  isHistorical?: boolean;
}

const liveSources: { key: EventSource; label: string; color: string }[] = [
  { key: 'geoconfirmed', label: 'GEOCON', color: 'text-status-green' },
  { key: 'adsb', label: 'ADS-B', color: 'text-terminal-blue' },
  { key: 'aisstream', label: 'AIS', color: 'text-terminal-amber' },
  { key: 'deepstate', label: 'DSTATE', color: 'text-terminal-red' },
  { key: 'telegram', label: 'TGRAM', color: 'text-terminal-blue' },
];

const historicalSources: { key: EventSource; label: string; color: string }[] = [
  { key: 'ucdp', label: 'UCDP', color: 'text-terminal-amber' },
];

const severities: { key: Severity; label: string; color: string }[] = [
  { key: 'critical', label: 'CRIT', color: 'text-severity-critical' },
  { key: 'high', label: 'HIGH', color: 'text-severity-high' },
  { key: 'medium', label: 'MED', color: 'text-severity-medium' },
  { key: 'low', label: 'LOW', color: 'text-severity-low' },
  { key: 'info', label: 'INFO', color: 'text-severity-info' },
];

export function FeedFilters({
  activeSources,
  activeSeverities,
  onToggleSource,
  onToggleSeverity,
  isHistorical = false,
}: FeedFiltersProps) {
  const sources = isHistorical ? historicalSources : liveSources;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 border-b border-tactical-border bg-tactical-surface/30">
      {/* Source filters */}
      <span className="text-xs font-mono text-tactical-text-dim mr-1">SRC:</span>
      {sources.map(({ key, label, color }) => (
        <button
          key={key}
          onClick={() => onToggleSource(key)}
          className={`text-xs font-mono transition-opacity ${
            activeSources.includes(key) ? `${color} opacity-100` : 'text-tactical-text-dim opacity-40'
          }`}
        >
          {label}
        </button>
      ))}

      <span className="text-tactical-border mx-1">|</span>

      {/* Severity filters */}
      <span className="text-xs font-mono text-tactical-text-dim mr-1">SEV:</span>
      {severities.map(({ key, label, color }) => (
        <button
          key={key}
          onClick={() => onToggleSeverity(key)}
          className={`text-xs font-mono transition-opacity ${
            activeSeverities.includes(key) ? `${color} opacity-100` : 'text-tactical-text-dim opacity-40'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
