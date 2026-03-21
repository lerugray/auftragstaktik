'use client';

interface LayerState {
  frontlines: boolean;
  aircraft: boolean;
  maritime: boolean;
  acled: boolean;
}

interface MapControlsProps {
  layers: LayerState;
  onToggle: (layer: keyof LayerState) => void;
}

const layerConfig: { key: keyof LayerState; label: string; color: string }[] = [
  { key: 'frontlines', label: 'FRONTLINES', color: 'text-terminal-red' },
  { key: 'aircraft', label: 'AIRCRAFT', color: 'text-terminal-blue' },
  { key: 'maritime', label: 'MARITIME', color: 'text-terminal-amber' },
  { key: 'acled', label: 'EVENTS', color: 'text-terminal-green' },
];

export function MapControls({ layers, onToggle }: MapControlsProps) {
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
    </div>
  );
}
