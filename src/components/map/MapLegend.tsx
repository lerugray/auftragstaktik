'use client';

const legendItems = [
  { label: 'Occupied territory', color: '#a52714', shape: 'fill' },
  { label: 'Contested / unknown', color: '#bcaaa4', shape: 'fill' },
  { label: 'Unit deployment zone', color: '#e65100', shape: 'dashed' },
  { label: 'Military aircraft', color: '#ff4444', shape: 'diamond' },
  { label: 'Civilian aircraft', color: '#00aaff', shape: 'diamond' },
  { label: 'Naval / military vessel', color: '#ff4444', shape: 'circle-diamond' },
  { label: 'Merchant vessel', color: '#4488cc', shape: 'circle' },
  { label: 'Fishing vessel', color: '#22aa66', shape: 'circle' },
  { label: 'Unknown vessel', color: '#888888', shape: 'circle' },
];

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
  // circle
  return (
    <svg width={size} height={size} viewBox="0 0 14 14">
      <circle cx="7" cy="7" r="5" fill={color + '33'} stroke={color} strokeWidth="1.5" />
      <circle cx="7" cy="7" r="1.5" fill={color} />
    </svg>
  );
}

export function MapLegend() {
  return (
    <div className="absolute bottom-12 right-2 bg-tactical-dark/90 border border-tactical-border p-3 max-w-[200px]">
      <div className="text-xs font-mono text-tactical-text-dim tracking-widest mb-2">LEGEND</div>
      <div className="flex flex-col gap-1.5">
        {legendItems.map(({ label, color, shape }) => (
          <div key={label} className="flex items-center gap-2">
            <LegendIcon color={color} shape={shape} />
            <span className="text-xs font-mono text-tactical-text">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
