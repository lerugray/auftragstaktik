'use client';

import { useState, useCallback } from 'react';

interface TimelineScrubberProps {
  onRangeChange: (daysBack: number) => void;
  visible: boolean;
}

const RANGE_OPTIONS = [
  { value: 1, label: '24H' },
  { value: 3, label: '3D' },
  { value: 7, label: '7D' },
  { value: 14, label: '14D' },
  { value: 30, label: '30D' },
  { value: 0, label: 'ALL' },
];

export function TimelineScrubber({ onRangeChange, visible }: TimelineScrubberProps) {
  const [activeRange, setActiveRange] = useState(0); // 0 = ALL

  const handleChange = useCallback((days: number) => {
    setActiveRange(days);
    onRangeChange(days);
  }, [onRangeChange]);

  if (!visible) return null;

  return (
    <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-tactical-dark/90 border border-tactical-border px-4 py-2 flex items-center gap-1 z-10">
      <span className="text-xs font-mono text-tactical-text-dim tracking-wider mr-2">TIMELINE:</span>
      {RANGE_OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => handleChange(value)}
          className={`px-2 py-1 text-xs font-mono tracking-wider transition-colors ${
            activeRange === value
              ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green/50'
              : 'text-tactical-text-dim hover:text-tactical-text border border-transparent'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
