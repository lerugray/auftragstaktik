'use client';

import { useState } from 'react';

interface LayerState {
  frontlines: boolean;
  aircraft: boolean;
  maritime: boolean;
  acled: boolean;
}

interface MapControlsProps {
  layers: LayerState;
  onToggle: (layer: keyof LayerState) => void;
  activeEventTypes?: Set<string>;
  onToggleEventType?: (type: string) => void;
  showEventFilters?: boolean;
}

const layerConfig: { key: keyof LayerState; label: string; color: string }[] = [
  { key: 'frontlines', label: 'FRONTLINES', color: 'text-terminal-red' },
  { key: 'aircraft', label: 'AIRCRAFT', color: 'text-terminal-blue' },
  { key: 'maritime', label: 'MARITIME', color: 'text-terminal-amber' },
  { key: 'acled', label: 'EVENTS', color: 'text-terminal-green' },
];

const eventTypeFilters: { type: string; label: string }[] = [
  { type: 'Missile strike', label: 'MISSILES' },
  { type: 'Drone strike', label: 'DRONES' },
  { type: 'Artillery/Shelling', label: 'ARTILLERY' },
  { type: 'Explosion/Strike', label: 'EXPLOSIONS' },
  { type: 'Armed clash', label: 'CLASHES' },
  { type: 'Fire/Smoke', label: 'FIRES' },
  { type: 'Conflict event', label: 'OTHER' },
];

export function MapControls({
  layers,
  onToggle,
  activeEventTypes,
  onToggleEventType,
  showEventFilters,
}: MapControlsProps) {
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  return (
    <div className="absolute top-2 right-2 bg-tactical-dark/90 border border-tactical-border p-3 flex flex-col gap-1.5">
      <div className="text-xs font-mono text-tactical-text-dim tracking-widest mb-1">
        LAYERS
      </div>
      {layerConfig.map(({ key, label, color }) => (
        <button
          key={key}
          onClick={() => onToggle(key)}
          className={`flex items-center gap-2.5 px-1.5 py-1 text-sm font-mono tracking-wider transition-opacity hover:opacity-100 ${
            layers[key] ? 'opacity-100' : 'opacity-30'
          }`}
        >
          <span
            className={`w-3 h-3 border ${
              layers[key]
                ? `${color} border-current bg-current/20`
                : 'border-tactical-text-dim'
            }`}
          />
          <span className={layers[key] ? color : 'text-tactical-text-dim'}>
            {label}
          </span>
        </button>
      ))}

      {/* Event type sub-filters */}
      {showEventFilters && activeEventTypes && onToggleEventType && (
        <>
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="flex items-center justify-between mt-1 pt-1.5 border-t border-tactical-border text-xs font-mono text-tactical-text-dim tracking-wider hover:text-tactical-text"
          >
            <span>EVENT FILTER</span>
            <span className="text-[10px]">{filtersExpanded ? '▲' : '▼'}</span>
          </button>

          {filtersExpanded && (
            <div className="flex flex-col gap-1 pl-1">
              {eventTypeFilters.map(({ type, label }) => {
                const active = activeEventTypes.has(type);
                return (
                  <button
                    key={type}
                    onClick={() => onToggleEventType(type)}
                    className={`flex items-center gap-2 px-1 py-0.5 text-xs font-mono tracking-wider transition-opacity hover:opacity-100 ${
                      active ? 'opacity-100' : 'opacity-30'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 ${
                        active
                          ? 'bg-terminal-green/40 border border-terminal-green'
                          : 'border border-tactical-text-dim'
                      }`}
                    />
                    <span className={active ? 'text-terminal-green' : 'text-tactical-text-dim'}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
