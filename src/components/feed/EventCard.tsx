'use client';

import type { EventRecord, Severity } from '@/lib/types/events';

const severityStyles: Record<Severity, { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-severity-critical/20', text: 'text-severity-critical', label: 'CRIT' },
  high: { bg: 'bg-severity-high/20', text: 'text-severity-high', label: 'HIGH' },
  medium: { bg: 'bg-severity-medium/20', text: 'text-severity-medium', label: 'MED' },
  low: { bg: 'bg-severity-low/20', text: 'text-severity-low', label: 'LOW' },
  info: { bg: 'bg-severity-info/20', text: 'text-severity-info', label: 'INFO' },
};

const sourceStyles: Record<string, { color: string; label: string }> = {
  acled: { color: 'text-terminal-green', label: 'GEOCON' },
  adsb: { color: 'text-terminal-blue', label: 'ADS-B' },
  aisstream: { color: 'text-terminal-amber', label: 'AIS' },
  deepstate: { color: 'text-terminal-red', label: 'DSTATE' },
};

function formatDTG(isoDate: string): string {
  const d = new Date(isoDate);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const mins = String(d.getUTCMinutes()).padStart(2, '0');
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day}${hours}${mins}Z ${month} ${year}`;
}

interface EventCardProps {
  event: EventRecord;
  onClick?: (event: EventRecord) => void;
}

export function EventCard({ event, onClick }: EventCardProps) {
  const severity = severityStyles[event.severity];
  const source = sourceStyles[event.source] || { color: 'text-tactical-text-dim', label: event.source.toUpperCase() };

  return (
    <button
      onClick={() => onClick?.(event)}
      className="w-full text-left px-3 py-2.5 border-b border-tactical-border hover:bg-tactical-surface/50 transition-colors"
    >
      {/* Top row: severity badge + DTG + source */}
      <div className="flex items-center gap-2 mb-1">
        <span className={`px-1.5 py-0.5 text-xs font-mono font-bold ${severity.bg} ${severity.text}`}>
          {severity.label}
        </span>
        <span className="text-xs font-mono text-tactical-text-dim">
          {formatDTG(event.timestamp)}
        </span>
        <span className={`ml-auto text-xs font-mono ${source.color}`}>
          [{source.label}]
        </span>
      </div>

      {/* Title */}
      <div className="text-sm font-mono text-tactical-text leading-tight mb-1">
        {event.title}
      </div>

      {/* Description (truncated) */}
      {event.description && (
        <div className="text-xs font-mono text-tactical-text-dim leading-snug line-clamp-2">
          {event.description}
        </div>
      )}
    </button>
  );
}
