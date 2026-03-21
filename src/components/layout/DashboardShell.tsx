'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { ClassificationBanner } from '@/components/ui/ClassificationBanner';
import { ScanlineOverlay } from '@/components/ui/ScanlineOverlay';
import { Header } from './Header';
import { PanelFrame } from './PanelFrame';
import { MapWrapper } from '@/components/map';
import { IntelFeed } from '@/components/feed/IntelFeed';
import { getDefaultTheater, getTheater } from '@/lib/theaters';
import type { EventRecord } from '@/lib/types/events';

// Map ref type for fly-to functionality
export interface MapHandle {
  flyTo: (lng: number, lat: number, zoom?: number) => void;
}

export function DashboardShell() {
  const [theaterId, setTheaterId] = useState(getDefaultTheater().id);
  const theater = useMemo(() => getTheater(theaterId) ?? getDefaultTheater(), [theaterId]);
  const mapHandleRef = useRef<MapHandle | null>(null);

  // Get the country name for the active theater's ACLED queries
  const theaterCountry = useMemo(() => {
    const acledSource = theater.dataSources.find((ds) => ds.source === 'acled');
    return (acledSource?.params?.country as string) || theater.name;
  }, [theater]);

  const handleEventClick = useCallback((event: EventRecord) => {
    if (mapHandleRef.current) {
      mapHandleRef.current.flyTo(event.coordinates[0], event.coordinates[1], 10);
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-tactical-dark text-tactical-text font-mono">
      <ClassificationBanner />
      <Header activeTheaterId={theaterId} onTheaterChange={setTheaterId} />

      {/* Main content: 3-panel layout */}
      <div className="flex-1 flex overflow-hidden p-2 gap-2">
        {/* Left: Map (65%) */}
        <div className="flex-[65] min-w-0">
          <PanelFrame title="Tactical Map" className="h-full">
            <MapWrapper theater={theater} mapHandleRef={mapHandleRef} />
          </PanelFrame>
        </div>

        {/* Right: Feed + Briefing (35%) */}
        <div className="flex-[35] flex flex-col gap-2 min-w-0">
          {/* Top: Intel Feed (60%) */}
          <PanelFrame title="Intelligence Feed" className="flex-[60]">
            <IntelFeed
              theaterId={theaterId}
              theaterCountry={theaterCountry}
              onEventClick={handleEventClick}
            />
          </PanelFrame>

          {/* Bottom: Briefing (40%) */}
          <PanelFrame title="Briefing Generator" className="flex-[40]">
            <div className="flex items-center justify-center h-full text-tactical-text-dim">
              <div className="text-center">
                <div className="text-terminal-blue/40 text-3xl mb-3">&#x2637;</div>
                <div className="text-base tracking-wider">SITREP MODULE STANDBY</div>
              </div>
            </div>
          </PanelFrame>
        </div>
      </div>

      <ClassificationBanner />
      <ScanlineOverlay />
    </div>
  );
}
