'use client';

import { useState, useMemo } from 'react';
import { ClassificationBanner } from '@/components/ui/ClassificationBanner';
import { ScanlineOverlay } from '@/components/ui/ScanlineOverlay';
import { Header } from './Header';
import { PanelFrame } from './PanelFrame';
import { MapWrapper } from '@/components/map';
import { getDefaultTheater, getTheater } from '@/lib/theaters';

export function DashboardShell() {
  const [theaterId, setTheaterId] = useState(getDefaultTheater().id);
  const theater = useMemo(() => getTheater(theaterId) ?? getDefaultTheater(), [theaterId]);

  return (
    <div className="flex flex-col h-screen bg-tactical-dark text-tactical-text font-mono">
      <ClassificationBanner />
      <Header activeTheaterId={theaterId} onTheaterChange={setTheaterId} />

      {/* Main content: 3-panel layout */}
      <div className="flex-1 flex overflow-hidden p-2 gap-2">
        {/* Left: Map (65%) */}
        <div className="flex-[65] min-w-0">
          <PanelFrame title="Tactical Map" className="h-full">
            <MapWrapper theater={theater} />
          </PanelFrame>
        </div>

        {/* Right: Feed + Briefing (35%) */}
        <div className="flex-[35] flex flex-col gap-2 min-w-0">
          {/* Top: Intel Feed (60%) */}
          <PanelFrame title="Intelligence Feed" className="flex-[60]">
            <div className="flex items-center justify-center h-full text-tactical-text-dim">
              <div className="text-center">
                <div className="text-terminal-amber/40 text-3xl mb-3">&#x25B6;</div>
                <div className="text-base tracking-wider">AWAITING INTEL STREAM...</div>
              </div>
            </div>
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
