'use client';

import type { AircraftRecord, MaritimeRecord } from '@/lib/types/events';

interface DetailPanelProps {
  aircraft?: AircraftRecord | null;
  vessel?: MaritimeRecord | null;
  onClose: () => void;
}

function formatAltitude(alt: number): string {
  if (alt <= 0) return 'GROUND';
  return `FL${Math.round(alt / 100).toString().padStart(3, '0')} (${alt.toLocaleString()}ft)`;
}

const CLASSIFICATION_LABELS: Record<string, { label: string; color: string }> = {
  military: { label: 'MILITARY', color: 'bg-terminal-red/20 text-terminal-red' },
  'law-enforcement': { label: 'LAW ENFC', color: 'bg-severity-high/20 text-severity-high' },
  'coast-guard': { label: 'COAST GRD', color: 'bg-severity-high/20 text-severity-high' },
  auxiliary: { label: 'AUXILIARY', color: 'bg-terminal-amber/20 text-terminal-amber' },
  merchant: { label: 'MERCHANT', color: 'bg-terminal-blue/20 text-terminal-blue' },
  fishing: { label: 'FISHING', color: 'bg-terminal-green/20 text-terminal-green' },
  unknown: { label: 'UNKNOWN', color: 'bg-tactical-text-dim/20 text-tactical-text-dim' },
};

export function DetailPanel({ aircraft, vessel, onClose }: DetailPanelProps) {
  if (!aircraft && !vessel) return null;

  return (
    <div className="absolute bottom-12 left-2 bg-tactical-dark/95 border border-tactical-border p-3 min-w-[280px] max-w-[350px]">
      {aircraft && <AircraftDetail aircraft={aircraft} onClose={onClose} />}
      {vessel && <VesselDetail vessel={vessel} onClose={onClose} />}
    </div>
  );
}

function AircraftDetail({ aircraft, onClose }: { aircraft: AircraftRecord; onClose: () => void }) {
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${aircraft.military ? 'bg-terminal-red' : 'bg-terminal-blue'}`} />
          <span className="text-sm font-mono font-bold text-tactical-text">
            {aircraft.callsign || aircraft.icao}
          </span>
          {aircraft.military && (
            <span className="text-xs font-mono px-1.5 py-0.5 bg-terminal-red/20 text-terminal-red">MIL</span>
          )}
        </div>
        <button onClick={onClose} className="text-tactical-text-dim hover:text-tactical-text text-sm font-mono px-1">X</button>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
        <DetailRow label="ICAO" value={aircraft.icao.toUpperCase()} />
        {aircraft.registration && <DetailRow label="REG" value={aircraft.registration} />}
        {aircraft.aircraftType && <DetailRow label="TYPE" value={aircraft.aircraftType} />}
        <DetailRow label="ALT" value={formatAltitude(aircraft.altitude)} />
        <DetailRow label="SPD" value={`${aircraft.speed} kts`} />
        <DetailRow label="HDG" value={`${Math.round(aircraft.heading)}°`} />
        {aircraft.verticalRate !== undefined && aircraft.verticalRate !== 0 && (
          <DetailRow label="V/S" value={`${aircraft.verticalRate > 0 ? '+' : ''}${aircraft.verticalRate} fpm`} />
        )}
        <DetailRow label="GND" value={aircraft.onGround ? 'YES' : 'NO'} />
      </div>
    </>
  );
}

function VesselDetail({ vessel, onClose }: { vessel: MaritimeRecord; onClose: () => void }) {
  const cls = CLASSIFICATION_LABELS[vessel.classification] || CLASSIFICATION_LABELS.unknown;
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-terminal-amber" />
          <span className="text-sm font-mono font-bold text-tactical-text">
            {vessel.name || vessel.mmsi}
          </span>
          <span className={`text-xs font-mono px-1.5 py-0.5 ${cls.color}`}>{cls.label}</span>
        </div>
        <button onClick={onClose} className="text-tactical-text-dim hover:text-tactical-text text-sm font-mono px-1">X</button>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
        <DetailRow label="MMSI" value={vessel.mmsi} />
        {vessel.imo && <DetailRow label="IMO" value={vessel.imo} />}
        {vessel.callsign && <DetailRow label="CALL" value={vessel.callsign} />}
        {vessel.flag && <DetailRow label="FLAG" value={vessel.flag} />}
        {vessel.shipClass && <DetailRow label="CLASS" value={vessel.shipClass} />}
        <DetailRow label="SPD" value={`${vessel.speed.toFixed(1)} kts`} />
        <DetailRow label="HDG" value={`${Math.round(vessel.heading)}°`} />
        {vessel.destination && <DetailRow label="DEST" value={vessel.destination} />}
      </div>
    </>
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
