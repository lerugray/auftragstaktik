'use client';

import { MutableRefObject } from 'react';
import dynamic from 'next/dynamic';
import type { Theater } from '@/lib/theaters';
import type { MapHandle } from '@/components/layout/DashboardShell';
import type { ThemeMode } from '@/lib/theme';

const TacticalMapInner = dynamic(
  () => import('./TacticalMap').then((mod) => ({ default: mod.TacticalMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-tactical-text-dim">
        <div className="text-center">
          <div className="text-terminal-green/30 text-2xl mb-2">&#x25A0; &#x25A0; &#x25A0;</div>
          <div className="tracking-wider font-mono text-base">INITIALIZING MAP ENGINE...</div>
        </div>
      </div>
    ),
  }
);

interface MapWrapperProps {
  theater: Theater;
  mapHandleRef?: MutableRefObject<MapHandle | null>;
  theme?: ThemeMode;
}

export function MapWrapper({ theater, mapHandleRef, theme }: MapWrapperProps) {
  return <TacticalMapInner theater={theater} mapHandleRef={mapHandleRef} theme={theme} />;
}
