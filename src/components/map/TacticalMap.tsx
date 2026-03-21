'use client';

import { useEffect, useRef, useState, useCallback, MutableRefObject } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { tacticalDarkStyle } from '@/lib/map/styles';
import { FrontlineLayer } from './FrontlineLayer';
import { MapControls } from './MapControls';
import type { Theater } from '@/lib/theaters';
import type { MapHandle } from '@/components/layout/DashboardShell';

interface TacticalMapProps {
  theater: Theater;
  mapHandleRef?: MutableRefObject<MapHandle | null>;
}

export function TacticalMap({ theater, mapHandleRef }: TacticalMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [zoom, setZoom] = useState(theater.zoom);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const [layers, setLayers] = useState({
    frontlines: true,
    aircraft: true,
    maritime: true,
    acled: true,
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: tacticalDarkStyle,
      center: theater.center,
      zoom: theater.zoom,
      minZoom: 3,
      maxZoom: 15,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-left'
    );

    // Nav controls — no compass to avoid overlap issues
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-right'
    );

    map.on('load', () => {
      setMapReady(true);
    });

    map.on('zoom', () => {
      setZoom(Math.round(map.getZoom() * 10) / 10);
    });

    map.on('mousemove', (e) => {
      setCursor([
        Math.round(e.lngLat.lng * 1000) / 1000,
        Math.round(e.lngLat.lat * 1000) / 1000,
      ]);
    });

    map.on('mouseout', () => {
      setCursor(null);
    });

    mapRef.current = map;

    // Expose flyTo handle
    if (mapHandleRef) {
      mapHandleRef.current = {
        flyTo: (lng: number, lat: number, zoom?: number) => {
          map.flyTo({ center: [lng, lat], zoom: zoom || 10, duration: 1200 });
        },
      };
    }

    return () => {
      mapRef.current = null;
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to new theater when it changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    map.flyTo({
      center: theater.center,
      zoom: theater.zoom,
      duration: 1500,
    });
  }, [theater.id, theater.center, theater.zoom, mapReady]);

  const toggleLayer = useCallback((layer: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {mapReady && mapRef.current && (
        <>
          {layers.frontlines && <FrontlineLayer map={mapRef.current} theater={theater} />}
        </>
      )}

      <MapControls layers={layers} onToggle={toggleLayer} />

      {/* Bottom status bar */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-6 bg-tactical-dark/80 border border-tactical-border px-3 py-1.5 pointer-events-none">
        <span className="text-xs font-mono text-terminal-green/80 tracking-wider">THEATER: {theater.name.toUpperCase()}</span>
        <span className="text-xs font-mono text-terminal-amber tracking-wider">ZOOM: {zoom}</span>
        {cursor && (
          <span className="text-xs font-mono text-tactical-text-dim tracking-wider">
            {cursor[1].toFixed(3)}°N {cursor[0].toFixed(3)}°E
          </span>
        )}
      </div>
    </div>
  );
}
