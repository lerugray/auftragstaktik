'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { Theater } from '@/lib/theaters';
import { getInstallationsForTheater, isFriendlyOperator, type MilitaryInstallation, type InstallationType } from '@/lib/data/militaryInstallations';
import ms from 'milsymbol';

interface InstallationsLayerProps {
  map: MaplibreMap;
  theater: Theater;
  onInstallationClick?: (installation: MilitaryInstallation) => void;
}

// Map installation types to appropriate MIL-STD-2525 SIDCs
function getInstallationSidc(installation: MilitaryInstallation): string {
  const friendly = isFriendlyOperator(installation.operator);
  const aff = friendly ? 'F' : 'H';
  // N = neutral for international chokepoints
  const chokepointAff = 'N';

  const sidcMap: Record<InstallationType, string> = {
    'airbase':        `S${aff}GPIA-------`,  // Military installation, airfield
    'naval-base':     `S${aff}GPIPD------`,  // Military installation, naval base
    'hq':             `S${aff}GPUH-------`,  // Unit HQ
    'logistics':      `S${aff}GPUSS------`,  // Support, supply
    'chokepoint':     `S${chokepointAff}GPGL-------`,  // General point
    'infrastructure': `S${aff}GPIE-------`,  // Installation, equipment
  };

  return sidcMap[installation.type] || `S${aff}GPI---------`;
}

function renderInstallationSymbol(sidc: string, size: number = 22): string {
  try {
    const symbol = new ms.Symbol(sidc, { size, frame: true, fill: true } as Record<string, unknown>);
    return symbol.asSVG();
  } catch {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" fill="#ff880033" stroke="#ff8800" stroke-width="2"/></svg>`;
  }
}

const TYPE_LABELS: Record<InstallationType, string> = {
  'airbase': 'AIR BASE',
  'naval-base': 'NAVAL BASE',
  'hq': 'HEADQUARTERS',
  'logistics': 'LOGISTICS',
  'chokepoint': 'CHOKEPOINT',
  'infrastructure': 'INFRASTRUCTURE',
};

export function InstallationsLayer({ map, theater, onInstallationClick }: InstallationsLayerProps) {
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  useEffect(() => {
    const sites = getInstallationsForTheater(theater.id);

    // Clear existing markers
    for (const marker of markersRef.current.values()) {
      marker.remove();
    }
    markersRef.current.clear();

    if (sites.length === 0) return;

    for (const site of sites) {
      const sidc = getInstallationSidc(site);
      const svgContent = renderInstallationSymbol(sidc, 22);
      const typeLabel = TYPE_LABELS[site.type] || site.type.toUpperCase();

      const el = document.createElement('div');
      el.className = 'installation-marker';
      el.style.cursor = 'pointer';
      el.innerHTML = svgContent;
      el.title = `${typeLabel}: ${site.name}\n${site.operator}\nStatus: ${site.status}`;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onInstallationClick?.(site);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([site.lng, site.lat])
        .addTo(map);

      markersRef.current.set(site.id, marker);
    }

    return () => {
      for (const marker of markersRef.current.values()) {
        marker.remove();
      }
      markersRef.current.clear();
    };
  }, [map, theater.id, onInstallationClick]);

  return null;
}
