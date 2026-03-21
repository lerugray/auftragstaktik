'use client';

import { useEffect, useState } from 'react';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { theaters } from '@/lib/theaters';

interface HeaderProps {
  activeTheaterId: string;
  onTheaterChange: (id: string) => void;
}

function formatUTCTime(date: Date): string {
  const parts = date.toISOString().split('T');
  const time = parts[1].substring(0, 8);
  const dateStr = parts[0].replace(/-/g, '.');
  return `${dateStr} ${time}Z`;
}

export function Header({ activeTheaterId, onTheaterChange }: HeaderProps) {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => setTime(formatUTCTime(new Date()));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-tactical-surface border-b border-tactical-border">
      {/* Left: Title */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-mono font-bold text-terminal-green tracking-[0.3em] uppercase">
          Auftragstaktik
        </h1>
        <select
          value={activeTheaterId}
          onChange={(e) => onTheaterChange(e.target.value)}
          className="bg-tactical-dark border border-tactical-border text-tactical-text text-xs font-mono px-2 py-1 focus:outline-none focus:border-terminal-green/50"
        >
          {theaters.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Center: Clock */}
      <div className="font-mono text-sm text-terminal-amber tracking-wider">
        {time || '\u00A0'}
      </div>

      {/* Right: Status indicators */}
      <div className="flex items-center gap-4">
        <StatusIndicator label="FRONTLINE" status="stale" />
        <StatusIndicator label="ADS-B" status="stale" />
        <StatusIndicator label="AIS" status="stale" />
        <StatusIndicator label="GEOCON" status="stale" />
      </div>
    </header>
  );
}
