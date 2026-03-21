'use client';

import dynamic from 'next/dynamic';
import type { Theater } from '@/lib/theaters';

const TacticalMapInner = dynamic(
  () => import('./TacticalMap').then((mod) => ({ default: mod.TacticalMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-tactical-text-dim text-sm">
        <div className="text-center">
          <div className="text-terminal-green/40 text-2xl mb-2">&#x25A0; &#x25A0; &#x25A0;</div>
          <div className="tracking-wider font-mono">INITIALIZING MAP ENGINE...</div>
        </div>
      </div>
    ),
  }
);

interface MapWrapperProps {
  theater: Theater;
}

export function MapWrapper({ theater }: MapWrapperProps) {
  return <TacticalMapInner theater={theater} />;
}
