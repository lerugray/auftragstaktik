'use client';

import type { ReactNode } from 'react';
import type { AircraftRecord, MaritimeRecord, EventRecord } from '@/lib/types/events';
import type { AirDefenseInstallation } from '@/lib/data/airDefense';
import { getAircraftWikiUrl, getVesselWikiUrl } from '@/lib/data/wikiLinks';

interface DetailPanelProps {
  aircraft?: AircraftRecord | null;
  vessel?: MaritimeRecord | null;
  event?: EventRecord | null;
  airDefense?: AirDefenseInstallation | null;
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

export function DetailPanel({ aircraft, vessel, event, airDefense, onClose }: DetailPanelProps) {
  if (!aircraft && !vessel && !event && !airDefense) return null;

  return (
    <div className="absolute bottom-12 left-2 bg-tactical-dark/95 border border-tactical-border p-3 min-w-[280px] max-w-[350px]">
      {aircraft && <AircraftDetail aircraft={aircraft} onClose={onClose} />}
      {vessel && <VesselDetail vessel={vessel} onClose={onClose} />}
      {event && <ConflictEventDetail event={event} onClose={onClose} />}
      {airDefense && <AirDefenseDetail installation={airDefense} onClose={onClose} />}
    </div>
  );
}

function WikiLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-terminal-blue hover:text-terminal-blue/80 hover:underline"
    >
      {children}
    </a>
  );
}

function AircraftDetail({ aircraft, onClose }: { aircraft: AircraftRecord; onClose: () => void }) {
  const typeValue = aircraft.aircraftType ? (
    <WikiLink href={getAircraftWikiUrl(aircraft.aircraftType)}>{aircraft.aircraftType}</WikiLink>
  ) : null;

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
        {typeValue && <DetailRow label="TYPE" value={typeValue} />}
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

  const classValue = vessel.shipClass ? (
    <WikiLink href={getVesselWikiUrl(vessel.shipClass)}>{vessel.shipClass}</WikiLink>
  ) : null;

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
        {classValue && <DetailRow label="CLASS" value={classValue} />}
        <DetailRow label="SPD" value={`${vessel.speed.toFixed(1)} kts`} />
        <DetailRow label="HDG" value={`${Math.round(vessel.heading)}°`} />
        {vessel.destination && <DetailRow label="DEST" value={vessel.destination} />}
      </div>
    </>
  );
}

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-severity-critical/20 text-severity-critical',
  high: 'bg-severity-high/20 text-severity-high',
  medium: 'bg-severity-medium/20 text-severity-medium',
  low: 'bg-severity-low/20 text-severity-low',
  info: 'bg-severity-info/20 text-severity-info',
};

function ConflictEventDetail({ event, onClose }: { event: EventRecord; onClose: () => void }) {
  const badgeClass = SEVERITY_BADGE[event.severity] || SEVERITY_BADGE.info;
  const newsUrl = `https://news.google.com/search?q=${encodeURIComponent(event.eventType + ' ' + event.title.split(' ').slice(0, 4).join(' '))}`;

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono px-1.5 py-0.5 font-bold ${badgeClass}`}>
            {event.severity.toUpperCase()}
          </span>
          <span className="text-sm font-mono font-bold text-tactical-text">
            {event.eventType}
          </span>
        </div>
        <button onClick={onClose} className="text-tactical-text-dim hover:text-tactical-text text-sm font-mono px-1">X</button>
      </div>
      <div className="text-sm font-mono text-tactical-text mb-2">{event.title}</div>
      {event.description && (
        <div className="text-xs font-mono text-tactical-text-dim mb-2 leading-relaxed">{event.description}</div>
      )}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
        <DetailRow label="DATE" value={event.timestamp.substring(0, 10)} />
        <DetailRow label="SRC" value={event.source.toUpperCase()} />
        <DetailRow label="LAT" value={event.coordinates[1].toFixed(4) + '°'} />
        <DetailRow label="LON" value={event.coordinates[0].toFixed(4) + '°'} />
      </div>
      <div className="mt-2 pt-2 border-t border-tactical-border flex gap-3">
        <a
          href={newsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-terminal-blue hover:text-terminal-blue/80 hover:underline"
        >
          NEWS COVERAGE
        </a>
      </div>
    </>
  );
}

const STATUS_BADGE: Record<string, string> = {
  confirmed: 'bg-terminal-green/20 text-terminal-green',
  suspected: 'bg-terminal-amber/20 text-terminal-amber',
  relocated: 'bg-tactical-text-dim/20 text-tactical-text-dim',
};

function AirDefenseDetail({ installation, onClose }: { installation: AirDefenseInstallation; onClose: () => void }) {
  const statusClass = STATUS_BADGE[installation.status] || STATUS_BADGE.suspected;
  const wikiUrl = `https://en.wikipedia.org/wiki/Special:Search/${encodeURIComponent(installation.system)}`;

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono px-1.5 py-0.5 font-bold ${statusClass}`}>
            {installation.status.toUpperCase()}
          </span>
          <span className="text-sm font-mono font-bold text-tactical-text">
            AIR DEFENSE
          </span>
        </div>
        <button onClick={onClose} className="text-tactical-text-dim hover:text-tactical-text text-sm font-mono px-1">X</button>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
        <DetailRow label="SYSTEM" value={
          <WikiLink href={wikiUrl}>{installation.system}</WikiLink>
        } />
        <DetailRow label="OPER" value={installation.operator} />
        <DetailRow label="LOC" value={installation.location} />
        <DetailRow label="RANGE" value={`${installation.rangeKm} km`} />
        <DetailRow label="LAT" value={installation.lat.toFixed(4) + '°'} />
        <DetailRow label="LON" value={installation.lng.toFixed(4) + '°'} />
        <DetailRow label="CONFIRMED" value={installation.lastConfirmed} />
      </div>
      <div className="mt-2 pt-2 border-t border-tactical-border text-xs font-mono text-tactical-text-dim leading-relaxed">
        {installation.source}
      </div>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <span className="text-tactical-text-dim">{label}</span>
      <span className="text-tactical-text">{value}</span>
    </>
  );
}
