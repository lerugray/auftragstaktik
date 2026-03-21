'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ClassificationBanner } from '@/components/ui/ClassificationBanner';
import { ScanlineOverlay } from '@/components/ui/ScanlineOverlay';
import { Header } from './Header';
import { PanelFrame } from './PanelFrame';
import { MapWrapper } from '@/components/map';
import { IntelFeed } from '@/components/feed/IntelFeed';
import { BriefingPanel } from '@/components/briefing/BriefingPanel';
import { getDefaultTheater, getTheater } from '@/lib/theaters';
import { getStoredTheme, setStoredTheme, type ThemeMode } from '@/lib/theme';
import type { EventRecord } from '@/lib/types/events';

// Map ref type for fly-to functionality
export interface MapHandle {
  flyTo: (lng: number, lat: number, zoom?: number) => void;
  highlightEvent?: (eventId: string) => void;
}

export function DashboardShell() {
  const [theaterId, setTheaterId] = useState(getDefaultTheater().id);
  const theater = useMemo(() => getTheater(theaterId) ?? getDefaultTheater(), [theaterId]);
  const mapHandleRef = useRef<MapHandle | null>(null);
  const [theme, setTheme] = useState<ThemeMode>('dark');

  // Load stored theme on mount
  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  // Apply theme class to body
  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', theme === 'light');
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      setStoredTheme(next);
      return next;
    });
  }, []);

  // Get GeoConfirmed conflict slugs for the active theater
  const theaterConflicts = useMemo(() => {
    const acledSource = theater.dataSources.find((ds) => ds.source === 'acled');
    const conflicts = acledSource?.params?.conflicts as string[] | undefined;
    return conflicts?.join(',') || 'ukraine';
  }, [theater]);

  const handleEventClick = useCallback((event: EventRecord) => {
    if (mapHandleRef.current) {
      mapHandleRef.current.flyTo(event.coordinates[0], event.coordinates[1], 10);
      mapHandleRef.current.highlightEvent?.(event.id);
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-tactical-dark text-tactical-text font-mono">
      <ClassificationBanner />
      <Header
        activeTheaterId={theaterId}
        onTheaterChange={setTheaterId}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main content: 3-panel layout */}
      <div className="flex-1 flex overflow-hidden p-2 gap-2">
        {/* Left: Map (65%) */}
        <div className="flex-[65] min-w-0">
          <PanelFrame title="Tactical Map" className="h-full">
            <MapWrapper theater={theater} mapHandleRef={mapHandleRef} theme={theme} />
          </PanelFrame>
        </div>

        {/* Right: Feed + Briefing (35%) */}
        <div className="flex-[35] flex flex-col gap-2 min-w-0">
          {/* Top: Intel Feed (60%) */}
          <PanelFrame title="Intelligence Feed" className="flex-[60]">
            <IntelFeed
              theaterId={theaterId}
              theaterConflicts={theaterConflicts}
              onEventClick={handleEventClick}
            />
          </PanelFrame>

          {/* Bottom: Briefing (40%) */}
          <PanelFrame title="Briefing Generator" className="flex-[40]">
            <BriefingPanel theaterId={theaterId} theaterName={theater.name} />
          </PanelFrame>
        </div>
      </div>

      <ClassificationBanner />
      <ScanlineOverlay />
    </div>
  );
}
