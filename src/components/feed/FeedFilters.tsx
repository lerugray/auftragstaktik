'use client';

import type { EventSource, Severity } from '@/lib/types/events';

interface FeedFiltersProps {
  activeSources: EventSource[];
  activeSeverities: Severity[];
  onToggleSource: (source: EventSource) => void;
  onToggleSeverity: (severity: Severity) => void;
  isHistorical?: boolean;
}

const liveSources: { key: EventSource; label: string; color: string; filterName: string }[] = [
  { key: 'geoconfirmed', label: 'GEOCON', color: 'text-status-green', filterName: 'GeoConfirmed conflict events' },
  { key: 'adsb', label: 'ADS-B', color: 'text-terminal-blue', filterName: 'ADS-B aircraft' },
  { key: 'aisstream', label: 'AIS', color: 'text-terminal-amber', filterName: 'AIS maritime tracks' },
  { key: 'deepstate', label: 'DSTATE', color: 'text-terminal-red', filterName: 'DeepState frontline data' },
  { key: 'telegram', label: 'TGRAM', color: 'text-terminal-blue', filterName: 'Telegram military blog posts' },
];

const historicalSources: { key: EventSource; label: string; color: string; filterName: string }[] = [
  { key: 'ucdp', label: 'UCDP', color: 'text-terminal-amber', filterName: 'UCDP historical georeferenced events' },
];

const severities: { key: Severity; label: string; color: string; filterName: string }[] = [
  { key: 'critical', label: 'CRIT', color: 'text-severity-critical', filterName: 'Critical severity' },
  { key: 'high', label: 'HIGH', color: 'text-severity-high', filterName: 'High severity' },
  { key: 'medium', label: 'MED', color: 'text-severity-medium', filterName: 'Medium severity' },
  { key: 'low', label: 'LOW', color: 'text-severity-low', filterName: 'Low severity' },
  { key: 'info', label: 'INFO', color: 'text-severity-info', filterName: 'Info severity' },
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
    <div
      role="group"
      aria-labelledby="feed-filters-heading"
      className="border-b border-tactical-border bg-tactical-surface/30"
    >
      <h2
        id="feed-filters-heading"
        className="text-xs font-mono text-terminal-green/80 tracking-widest px-3 pt-2 pb-1"
      >
        INTEL FILTERS
      </h2>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 pb-2">
        {/* Source filters */}
        <span className="text-xs font-mono text-tactical-text-dim mr-1">SRC:</span>
        {sources.map(({ key, label, color, filterName }) => {
          const on = activeSources.includes(key);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              aria-label={`${filterName}. ${on ? 'Shown in feed' : 'Hidden from feed'}. Toggle to ${on ? 'hide' : 'show'}.`}
              onClick={() => onToggleSource(key)}
              className={`text-xs font-mono transition-opacity ${
                on ? `${color} opacity-100` : 'text-tactical-text-dim opacity-40'
              }`}
            >
              {label}
            </button>
          );
        })}

        <span className="text-tactical-border mx-1" aria-hidden>
          |
        </span>

        {/* Severity filters */}
        <span className="text-xs font-mono text-tactical-text-dim mr-1">SEV:</span>
        {severities.map(({ key, label, color, filterName }) => {
          const on = activeSeverities.includes(key);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              aria-label={`${filterName}. ${on ? 'Shown in feed' : 'Hidden from feed'}. Toggle to ${on ? 'hide' : 'show'}.`}
              onClick={() => onToggleSeverity(key)}
              className={`text-xs font-mono transition-opacity ${
                on ? `${color} opacity-100` : 'text-tactical-text-dim opacity-40'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
