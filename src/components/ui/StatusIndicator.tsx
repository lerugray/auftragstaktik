'use client';

type Status = 'connected' | 'stale' | 'error';

const statusColors: Record<Status, string> = {
  connected: 'bg-status-green',
  stale: 'bg-terminal-amber',
  error: 'bg-terminal-red',
};

interface StatusIndicatorProps {
  label: string;
  status: Status;
}

const statusDescription: Record<Status, string> = {
  connected: 'live',
  stale: 'stale or cached',
  error: 'error',
};

export function StatusIndicator({ label, status }: StatusIndicatorProps) {
  const detail = statusDescription[status];
  return (
    <div className="flex items-center gap-2 text-sm font-mono text-tactical-text-dim">
      <span
        role="img"
        aria-label={`${label} data status: ${detail}`}
        className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusColors[status]} ${status === 'connected' ? 'pulse-live' : ''}`}
      />
      <span aria-hidden="true">{label}</span>
    </div>
  );
}
