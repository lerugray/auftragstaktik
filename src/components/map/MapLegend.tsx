'use client';

import { useState } from 'react';
import ms from 'milsymbol';

// Items using simple SVG shapes (territories, vessels)
const shapeItems = [
  { label: 'Occupied territory', color: '#a52714', shape: 'fill' },
  { label: 'Contested / unknown', color: '#bcaaa4', shape: 'fill' },
  { label: 'Unit deployment zone', color: '#e65100', shape: 'dashed' },
  { label: 'Naval / military vessel', color: '#ff4444', shape: 'circle-diamond' },
  { label: 'Merchant vessel', color: '#4488cc', shape: 'circle' },
  { label: 'Fishing vessel', color: '#22aa66', shape: 'circle' },
  { label: 'Unknown vessel', color: '#888888', shape: 'circle' },
];

// Items using actual NATO milsymbol renderings (aircraft) — colors must match milsymbolFactory
const natoItems = [
  { sidc: 'SHAP----------', label: 'Military aircraft', colors: { fillColor: '#ff444433', iconColor: '#ff4444' } },
  { sidc: 'SNAPCF--------', label: 'Civilian / commercial aircraft', colors: { fillColor: '#00aaff33', iconColor: '#00aaff' } },
];

const natoSymbolRef = [
  { sidc: 'SHGPUCFRMS----', label: 'Missile Strike', desc: 'Hostile surface-to-surface missile attack' },
  { sidc: 'SHAPUCFRD-----', label: 'Drone / Air Strike', desc: 'Hostile unmanned aerial vehicle strike' },
  { sidc: 'SHGPUCFRA-----', label: 'Artillery / Shelling', desc: 'Hostile indirect fire, artillery, or rocket attack' },
  { sidc: 'SHGPUCFRSS----', label: 'Explosion', desc: 'Hostile detonation or explosive event' },
  { sidc: 'SHGPUCI-------', label: 'Armed Clash', desc: 'Hostile ground engagement between forces' },
  { sidc: 'SHGPUCAT------', label: 'Armor (Destroyed)', desc: 'Hostile tank or armored vehicle, destroyed' },
  { sidc: 'SHAP----------', label: 'Military Aircraft', desc: 'Hostile fixed-wing aircraft (ADS-B tracked)' },
  { sidc: 'SNAPCF--------', label: 'Civilian / Commercial', desc: 'Neutral civilian or commercial fixed-wing (ADS-B tracked)' },
  { sidc: 'SHSPCL--------', label: 'Naval Event', desc: 'Hostile naval or maritime-related event' },
  { sidc: 'SHGPE---------', label: 'General Event', desc: 'Hostile activity, type unspecified' },
];

function renderMilSymbol(sidc: string, size: number = 20, colors?: { fillColor?: string; iconColor?: string }): string {
  try {
    const symbol = new ms.Symbol(sidc, { size, frame: true, fill: true, ...colors } as Record<string, unknown>);
    return symbol.asSVG();
  } catch {
    return '';
  }
}

function LegendIcon({ color, shape }: { color: string; shape: string }) {
  const size = 14;
  if (shape === 'fill') {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14">
        <rect x="1" y="1" width="12" height="12" fill={color + '44'} stroke={color} strokeWidth="1.5" />
      </svg>
    );
  }
  if (shape === 'dashed') {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14">
        <rect x="1" y="1" width="12" height="12" fill={color + '22'} stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
      </svg>
    );
  }
  if (shape === 'diamond') {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14">
        <polygon points="7,1 13,7 7,13 1,7" fill={color + '33'} stroke={color} strokeWidth="1.5" />
      </svg>
    );
  }
  if (shape === 'circle-diamond') {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14">
        <polygon points="7,2 12,7 7,12 2,7" fill={color + '33'} stroke={color} strokeWidth="1.5" />
        <circle cx="7" cy="7" r="2" fill={color} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 14 14">
      <circle cx="7" cy="7" r="5" fill={color + '33'} stroke={color} strokeWidth="1.5" />
      <circle cx="7" cy="7" r="1.5" fill={color} />
    </svg>
  );
}

export function MapLegend() {
  const [expanded, setExpanded] = useState(false);
  const [showNato, setShowNato] = useState(false);

  return (
    <div className="absolute bottom-12 right-2 bg-tactical-dark/90 border border-tactical-border max-w-[260px]">
      {/* Header — click to collapse/expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono text-tactical-text-dim tracking-widest hover:text-tactical-text"
      >
        <span>LEGEND</span>
        <span>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          {/* Map symbols */}
          <div className="flex flex-col gap-1.5 mb-3">
            {shapeItems.map(({ label, color, shape }) => (
              <div key={label} className="flex items-center gap-2">
                <LegendIcon color={color} shape={shape} />
                <span className="text-xs font-mono text-tactical-text">{label}</span>
              </div>
            ))}
            {natoItems.map(({ sidc, label, colors }) => (
              <div key={sidc} className="flex items-center gap-2">
                <div
                  className="flex-shrink-0 w-[14px] h-[14px] flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: renderMilSymbol(sidc, 16, colors) }}
                />
                <span className="text-xs font-mono text-tactical-text">{label}</span>
              </div>
            ))}
          </div>

          {/* NATO Symbol Reference toggle */}
          <button
            onClick={() => setShowNato(!showNato)}
            className="w-full flex items-center justify-between py-1.5 border-t border-tactical-border text-xs font-mono text-terminal-green/80 tracking-wider hover:text-terminal-green"
          >
            <span>NATO SYMBOL REFERENCE</span>
            <span>{showNato ? '▲' : '▼'}</span>
          </button>

          {showNato && (
            <div className="flex flex-col gap-2 mt-2 max-h-[300px] overflow-y-auto">
              {natoSymbolRef.map(({ sidc, label, desc }) => (
                <div key={sidc} className="flex items-start gap-2">
                  <div
                    className="flex-shrink-0 mt-0.5"
                    dangerouslySetInnerHTML={{ __html: renderMilSymbol(sidc, 22) }}
                  />
                  <div>
                    <div className="text-xs font-mono text-tactical-text font-bold">{label}</div>
                    <div className="text-[11px] font-mono text-tactical-text-dim leading-snug">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
