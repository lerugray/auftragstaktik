'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { Theater } from '@/lib/theaters';
import { getAirDefenseForTheater, type AirDefenseInstallation } from '@/lib/data/airDefense';
import ms from 'milsymbol';

interface AirDefenseLayerProps {
  map: MaplibreMap;
  theater: Theater;
  onInstallationClick?: (installation: AirDefenseInstallation) => void;
}

// MIL-STD-2525 SIDCs for air defense
function getADSidc(installation: AirDefenseInstallation): string {
  // S = Warfighting, affiliation based on operator
  const friendly = ['Ukraine', 'Israel', 'Saudi Arabia'].includes(installation.operator);
  const aff = friendly ? 'F' : 'H';
  // G = Ground, U = Unit, C = Combat, D = Air Defense
  return `S${aff}GPUCD----`;
}

function renderADSymbol(sidc: string, size: number = 24): string {
  try {
    const symbol = new ms.Symbol(sidc, {
      size,
      frame: true,
      fill: true,
    } as Record<string, unknown>);
    return symbol.asSVG();
  } catch {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><polygon points="12,2 22,12 12,22 2,12" fill="#ff880033" stroke="#ff8800" stroke-width="2"/><text x="12" y="16" text-anchor="middle" fill="#ff8800" font-size="10">AD</text></svg>`;
  }
}

export function AirDefenseLayer({ map, theater, onInstallationClick }: AirDefenseLayerProps) {
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  useEffect(() => {
    const sites = getAirDefenseForTheater(theater.id);

    // Clear existing markers
    for (const marker of markersRef.current.values()) {
      marker.remove();
    }
    markersRef.current.clear();

    for (const site of sites) {
      const sidc = getADSidc(site);
      const svgContent = renderADSymbol(sidc, 22);

      const el = document.createElement('div');
      el.className = 'ad-marker';
      el.style.cursor = 'pointer';
      el.innerHTML = svgContent;
      el.title = `${site.system} (${site.operator})\n${site.location}\nStatus: ${site.status}`;

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
