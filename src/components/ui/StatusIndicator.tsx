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

export function StatusIndicator({ label, status }: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-sm font-mono text-tactical-text-dim">
      <span
        className={`w-2.5 h-2.5 rounded-full ${statusColors[status]} ${status === 'connected' ? 'pulse-live' : ''}`}
      />
      {label}
    </div>
  );
}
