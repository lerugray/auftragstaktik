'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface HistoricalTimelineProps {
  startYear: number;
  endYear: number;
  visible: boolean;
  onYearRangeChange: (startYear: number, endYear: number) => void;
}

export function HistoricalTimeline({ startYear, endYear, visible, onYearRangeChange }: HistoricalTimelineProps) {
  const [selectedStart, setSelectedStart] = useState(startYear);
  const [selectedEnd, setSelectedEnd] = useState(endYear);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset when theater changes
  useEffect(() => {
    setSelectedStart(startYear);
    setSelectedEnd(endYear);
    setPlaying(false);
  }, [startYear, endYear]);

  // Playback — step one year forward every 2 seconds
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setSelectedStart(prev => {
          const next = prev + 1;
          if (next > endYear) {
            setPlaying(false);
            return startYear; // Reset to start
          }
          setSelectedEnd(next);
          onYearRangeChange(next, next);
          return next;
        });
      }, 2000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, startYear, endYear, onYearRangeChange]);

  const handleShowAll = useCallback(() => {
    setSelectedStart(startYear);
    setSelectedEnd(endYear);
    setPlaying(false);
    onYearRangeChange(startYear, endYear);
  }, [startYear, endYear, onYearRangeChange]);

  const handleYearClick = useCallback((year: number) => {
    setSelectedStart(year);
    setSelectedEnd(year);
    setPlaying(false);
    onYearRangeChange(year, year);
  }, [onYearRangeChange]);

  const togglePlayback = useCallback(() => {
    if (playing) {
      setPlaying(false);
    } else {
      // Start from current selectedStart or beginning
      setSelectedStart(prev => {
        const start = prev >= endYear ? startYear : prev;
        setSelectedEnd(start);
        onYearRangeChange(start, start);
        return start;
      });
      setPlaying(true);
    }
  }, [playing, startYear, endYear, onYearRangeChange]);

  if (!visible) return null;

  const years: number[] = [];
  for (let y = startYear; y <= endYear; y++) {
    years.push(y);
  }

  const isAllSelected = selectedStart === startYear && selectedEnd === endYear;

  return (
    <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-tactical-dark/90 border border-tactical-border px-4 py-2 flex items-center gap-1 z-10 max-w-[90vw] overflow-x-auto">
      <span className="text-xs font-mono text-terminal-amber tracking-wider mr-2 flex-shrink-0">HISTORICAL:</span>

      {/* Playback button */}
      <button
        onClick={togglePlayback}
        className={`px-2 py-1 text-xs font-mono tracking-wider mr-1 flex-shrink-0 border ${
          playing
            ? 'bg-terminal-red/20 text-terminal-red border-terminal-red/50'
            : 'text-terminal-green hover:text-terminal-green/80 border-transparent hover:border-terminal-green/30'
        }`}
        title={playing ? 'Stop playback' : 'Play through years'}
      >
        {playing ? '||' : '\u25B6'}
      </button>

      {/* Show ALL button */}
      <button
        onClick={handleShowAll}
        className={`px-2 py-1 text-xs font-mono tracking-wider flex-shrink-0 transition-colors ${
          isAllSelected
            ? 'bg-terminal-amber/20 text-terminal-amber border border-terminal-amber/50'
            : 'text-tactical-text-dim hover:text-tactical-text border border-transparent'
        }`}
      >
        ALL
      </button>

      {/* Year buttons */}
      {years.map((year) => {
        const isActive = year >= selectedStart && year <= selectedEnd && !isAllSelected;
        return (
          <button
            key={year}
            onClick={() => handleYearClick(year)}
            className={`px-1.5 py-1 text-xs font-mono tracking-wider flex-shrink-0 transition-colors ${
              isActive
                ? 'bg-terminal-amber/20 text-terminal-amber border border-terminal-amber/50'
                : 'text-tactical-text-dim hover:text-tactical-text border border-transparent'
            }`}
          >
            {year}
          </button>
        );
      })}
    </div>
  );
}
