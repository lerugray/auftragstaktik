'use client';

import { useState } from 'react';

interface LayerState {
  frontlines: boolean;
  aircraft: boolean;
  airDefense: boolean;
  installations: boolean;
  radar: boolean;
  nuclear: boolean;
  heatmap: boolean;
  maritime: boolean;
  events: boolean;
}

interface MapControlsProps {
  layers: LayerState;
  onToggle: (layer: keyof LayerState) => void;
  activeEventTypes?: Set<string>;
  onToggleEventType?: (type: string) => void;
  showEventFilters?: boolean;
  isHistorical?: boolean;
}

// Layers that require live data feeds
const LIVE_ONLY_LAYERS: Set<keyof LayerState> = new Set(['frontlines', 'aircraft', 'maritime']);

const layerConfig: { key: keyof LayerState; label: string; color: string }[] = [
  { key: 'frontlines', label: 'FRONTLINES', color: 'text-terminal-red' },
  { key: 'aircraft', label: 'AIRCRAFT', color: 'text-terminal-blue' },
  { key: 'airDefense', label: 'AIR DEFENSE', color: 'text-severity-high' },
  { key: 'installations', label: 'INSTALLATIONS', color: 'text-terminal-amber' },
  { key: 'radar', label: 'RADAR / SENSORS', color: 'text-purple-400' },
  { key: 'nuclear', label: 'NUCLEAR / CBRN', color: 'text-yellow-400' },
  { key: 'heatmap', label: 'HEATMAP', color: 'text-severity-medium' },
  { key: 'maritime', label: 'MARITIME', color: 'text-terminal-amber' },
  { key: 'events', label: 'EVENTS', color: 'text-terminal-green' },
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

const historicalEventTypeFilters: { type: string; label: string }[] = [
  { type: 'State-based conflict', label: 'STATE' },
  { type: 'Non-state conflict', label: 'NON-STATE' },
  { type: 'One-sided violence', label: 'ONE-SIDED' },
];

export function MapControls({
  layers,
  onToggle,
  activeEventTypes,
  onToggleEventType,
  showEventFilters,
  isHistorical = false,
}: MapControlsProps) {
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const eventFilters = isHistorical ? historicalEventTypeFilters : eventTypeFilters;

  return (
    <div className="absolute top-2 right-2 bg-tactical-dark/90 border border-tactical-border p-3 flex flex-col gap-1.5">
      <div className="text-xs font-mono text-tactical-text-dim tracking-widest mb-1">
        LAYERS
      </div>
      {layerConfig.map(({ key, label, color }) => {
        const isLiveOnly = LIVE_ONLY_LAYERS.has(key);
        const disabled = isHistorical && isLiveOnly;

        return (
          <button
            key={key}
            onClick={() => !disabled && onToggle(key)}
            className={`flex items-center gap-2.5 px-1.5 py-1 text-sm font-mono tracking-wider transition-opacity ${
              disabled
                ? 'opacity-15 cursor-not-allowed'
                : layers[key]
                  ? 'opacity-100 hover:opacity-100'
                  : 'opacity-30 hover:opacity-100'
            }`}
            title={disabled ? 'Not available in historical mode' : undefined}
          >
            <span
              className={`w-3 h-3 border ${
                disabled
                  ? 'border-tactical-text-dim/30'
                  : layers[key]
                    ? `${color} border-current bg-current/20`
                    : 'border-tactical-text-dim'
              }`}
            />
            <span className={disabled ? 'text-tactical-text-dim/30' : layers[key] ? color : 'text-tactical-text-dim'}>
              {label}
            </span>
          </button>
        );
      })}

      {/* Event type sub-filters */}
      {showEventFilters && activeEventTypes && onToggleEventType && (
        <>
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="flex items-center justify-between mt-1 pt-1.5 border-t border-tactical-border text-xs font-mono text-tactical-text-dim tracking-wider hover:text-tactical-text"
          >
            <span>EVENT FILTER</span>
            <span className="text-[10px]">{filtersExpanded ? '\u25B2' : '\u25BC'}</span>
          </button>

          {filtersExpanded && (
            <div className="flex flex-col gap-1 pl-1">
              {eventFilters.map(({ type, label }) => {
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
