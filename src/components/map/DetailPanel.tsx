'use client';

import type { AircraftRecord } from '@/lib/types/events';

interface DetailPanelProps {
  aircraft: AircraftRecord | null;
  onClose: () => void;
}

function formatAltitude(alt: number): string {
  if (alt <= 0) return 'GROUND';
  return `FL${Math.round(alt / 100).toString().padStart(3, '0')} (${alt.toLocaleString()}ft)`;
}

export function DetailPanel({ aircraft, onClose }: DetailPanelProps) {
  if (!aircraft) return null;

  return (
    <div className="absolute bottom-12 left-2 bg-tactical-dark/95 border border-tactical-border p-3 min-w-[280px] max-w-[350px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${aircraft.military ? 'bg-terminal-red' : 'bg-terminal-blue'}`} />
          <span className="text-sm font-mono font-bold text-tactical-text">
            {aircraft.callsign || aircraft.icao}
          </span>
          {aircraft.military && (
            <span className="text-xs font-mono px-1.5 py-0.5 bg-terminal-red/20 text-terminal-red">
              MIL
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-tactical-text-dim hover:text-tactical-text text-sm font-mono px-1"
        >
          X
        </button>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
        <DetailRow label="ICAO" value={aircraft.icao.toUpperCase()} />
        {aircraft.registration && <DetailRow label="REG" value={aircraft.registration} />}
        {aircraft.aircraftType && <DetailRow label="TYPE" value={aircraft.aircraftType} />}
        <DetailRow label="ALT" value={formatAltitude(aircraft.altitude)} />
        <DetailRow label="SPD" value={`${aircraft.speed} kts`} />
        <DetailRow label="HDG" value={`${Math.round(aircraft.heading)}°`} />
        {aircraft.verticalRate !== undefined && aircraft.verticalRate !== 0 && (
          <DetailRow
            label="V/S"
            value={`${aircraft.verticalRate > 0 ? '+' : ''}${aircraft.verticalRate} fpm`}
          />
        )}
        <DetailRow label="GND" value={aircraft.onGround ? 'YES' : 'NO'} />
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-tactical-text-dim">{label}</span>
      <span className="text-tactical-text">{value}</span>
    </>
  );
}
