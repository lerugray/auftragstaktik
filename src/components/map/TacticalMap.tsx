'use client';

import { useEffect, useRef, useState, useCallback, MutableRefObject } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getMapStyle } from '@/lib/map/styles';
import type { ThemeMode } from '@/lib/theme';
import { FrontlineLayer } from './FrontlineLayer';
import { AircraftLayer } from './AircraftLayer';
import { MaritimeLayer } from './MaritimeLayer';
import { ConflictEventLayer } from './ConflictEventLayer';
import { AirDefenseLayer } from './AirDefenseLayer';
import { InstallationsLayer } from './InstallationsLayer';
import { RadarLayer } from './RadarLayer';
import { NuclearLayer } from './NuclearLayer';
import { HeatmapLayer } from './HeatmapLayer';
import { TimelineScrubber } from './TimelineScrubber';
import { HistoricalTimeline } from './HistoricalTimeline';
import { DetailPanel } from './DetailPanel';
import { MapControls } from './MapControls';
import { MapLegend } from './MapLegend';
import type { Theater } from '@/lib/theaters';
import type { MapHandle } from '@/components/layout/DashboardShell';
import type { AircraftRecord, MaritimeRecord, EventRecord } from '@/lib/types/events';
import type { AirDefenseInstallation } from '@/lib/data/airDefense';
import type { MilitaryInstallation } from '@/lib/data/militaryInstallations';
import type { RadarInstallation } from '@/lib/data/radarSites';
import type { NuclearFacility } from '@/lib/data/nuclearFacilities';

interface TacticalMapProps {
  theater: Theater;
  mapHandleRef?: MutableRefObject<MapHandle | null>;
  theme?: ThemeMode;
}

export function TacticalMap({ theater, mapHandleRef, theme = 'dark' }: TacticalMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [zoom, setZoom] = useState(theater.zoom);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const [selectedAircraft, setSelectedAircraft] = useState<AircraftRecord | null>(null);
  const [selectedVessel, setSelectedVessel] = useState<MaritimeRecord | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [selectedAD, setSelectedAD] = useState<AirDefenseInstallation | null>(null);
  const [selectedInstallation, setSelectedInstallation] = useState<MilitaryInstallation | null>(null);
  const [selectedRadar, setSelectedRadar] = useState<RadarInstallation | null>(null);
  const [selectedNuclear, setSelectedNuclear] = useState<NuclearFacility | null>(null);
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  const [timelineDaysBack, setTimelineDaysBack] = useState(0); // 0 = all
  const [historicalYearFilter, setHistoricalYearFilter] = useState<{ startYear: number; endYear: number } | null>(null);
  const [historicalFatalities, setHistoricalFatalities] = useState(0);
  const [activeEventTypes, setActiveEventTypes] = useState<Set<string>>(new Set([
    'Missile strike', 'Drone strike', 'Air/drone strike',
    'Explosion/Strike', 'Artillery/Shelling', 'Shelling/artillery/missile attack',
    'Armed clash', 'Battles',
    'Tank destroyed', 'Vehicle destroyed', 'APC/IFV destroyed',
    'Fire/Smoke', 'Fortification', 'Troops', 'Conflict event',
    'Strategic developments', 'Other',
    // UCDP event types
    'State-based conflict', 'Non-state conflict', 'One-sided violence',
  ]));

  const isHistorical = !!theater.historical;

  const [layers, setLayers] = useState({
    frontlines: true,
    aircraft: true,
    airDefense: true,
    installations: false,
    radar: false,
    nuclear: false,
    heatmap: false,
    maritime: true,
    events: true,
  });

  // Reset historical year filter when theater changes
  useEffect(() => {
    setHistoricalYearFilter(null);
  }, [theater.id]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyle(theme),
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

    // Click on map (not on a marker) closes detail panel
    map.on('click', () => {
      setSelectedAircraft(null);
      setSelectedVessel(null);
      setSelectedEvent(null);
    });

    mapRef.current = map;

    if (mapHandleRef) {
      mapHandleRef.current = {
        flyTo: (lng: number, lat: number, zoom?: number) => {
          map.flyTo({ center: [lng, lat], zoom: zoom || 10, duration: 1200 });
        },
        highlightEvent: (eventId: string) => {
          setHighlightedEventId(eventId);
        },
      };
    }

    return () => {
      mapRef.current = null;
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap basemap when theme changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.setStyle(getMapStyle(theme));
  }, [theme, mapReady]);

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

  const clearSelections = useCallback(() => {
    setSelectedAircraft(null);
    setSelectedVessel(null);
    setSelectedEvent(null);
    setSelectedAD(null);
    setSelectedInstallation(null);
    setSelectedRadar(null);
    setSelectedNuclear(null);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case '1': toggleLayer('frontlines'); break;
        case '2': toggleLayer('aircraft'); break;
        case '3': toggleLayer('airDefense'); break;
        case '4': toggleLayer('installations'); break;
        case '5': toggleLayer('radar'); break;
        case '6': toggleLayer('nuclear'); break;
        case '7': toggleLayer('heatmap'); break;
        case '8': toggleLayer('maritime'); break;
        case '9': toggleLayer('events'); break;
        case 'Escape': clearSelections(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleLayer, clearSelections]);

  const handleAircraftClick = useCallback((aircraft: AircraftRecord) => {
    clearSelections();
    setSelectedAircraft(aircraft);
  }, [clearSelections]);

  const handleVesselClick = useCallback((vessel: MaritimeRecord) => {
    clearSelections();
    setSelectedVessel(vessel);
  }, [clearSelections]);

  const handleEventClick = useCallback((event: EventRecord) => {
    clearSelections();
    setSelectedEvent(event);
  }, [clearSelections]);

  const handleADClick = useCallback((installation: AirDefenseInstallation) => {
    clearSelections();
    setSelectedAD(installation);
  }, [clearSelections]);

  const handleInstallationClick = useCallback((installation: MilitaryInstallation) => {
    clearSelections();
    setSelectedInstallation(installation);
  }, [clearSelections]);

  const handleRadarClick = useCallback((radar: RadarInstallation) => {
    clearSelections();
    setSelectedRadar(radar);
  }, [clearSelections]);

  const handleNuclearClick = useCallback((facility: NuclearFacility) => {
    clearSelections();
    setSelectedNuclear(facility);
  }, [clearSelections]);

  const handleHistoricalYearChange = useCallback((startYear: number, endYear: number) => {
    setHistoricalYearFilter({ startYear, endYear });
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {mapReady && mapRef.current && (
        <>
          {/* Live-only layers — disabled in historical mode */}
          {!isHistorical && layers.frontlines && <FrontlineLayer map={mapRef.current} theater={theater} />}
          {!isHistorical && layers.aircraft && (
            <AircraftLayer
              map={mapRef.current}
              theater={theater}
              onAircraftClick={handleAircraftClick}
            />
          )}
          {!isHistorical && layers.maritime && (
            <MaritimeLayer
              map={mapRef.current}
              theater={theater}
              onVesselClick={handleVesselClick}
            />
          )}

          {/* Events layer — works in both modes */}
          {layers.events && (
            <ConflictEventLayer
              map={mapRef.current}
              theater={theater}
              onEventClick={handleEventClick}
              activeEventTypes={activeEventTypes}
              highlightedEventId={highlightedEventId}
              onHighlightClear={() => setHighlightedEventId(null)}
              timelineDaysBack={timelineDaysBack}
              historicalYearFilter={historicalYearFilter}
              onFatalityUpdate={setHistoricalFatalities}
            />
          )}

          {/* Heatmap — works in both modes */}
          {layers.heatmap && (
            <HeatmapLayer
              map={mapRef.current}
              theater={theater}
            />
          )}

          {/* Static layers — available in both modes */}
          {layers.airDefense && (
            <AirDefenseLayer
              map={mapRef.current}
              theater={theater}
              onInstallationClick={handleADClick}
            />
          )}
          {layers.installations && (
            <InstallationsLayer
              map={mapRef.current}
              theater={theater}
              onInstallationClick={handleInstallationClick}
            />
          )}
          {layers.radar && (
            <RadarLayer
              map={mapRef.current}
              theater={theater}
              onRadarClick={handleRadarClick}
            />
          )}
          {layers.nuclear && (
            <NuclearLayer
              map={mapRef.current}
              theater={theater}
              onFacilityClick={handleNuclearClick}
            />
          )}
        </>
      )}

      <MapControls
        layers={layers}
        onToggle={toggleLayer}
        activeEventTypes={activeEventTypes}
        onToggleEventType={(type) => {
          setActiveEventTypes((prev) => {
            const next = new Set(prev);
            if (next.has(type)) next.delete(type);
            else next.add(type);
            return next;
          });
        }}
        showEventFilters={layers.events}
        isHistorical={isHistorical}
      />

      <MapLegend />

      {/* Detail panel */}
      <DetailPanel
        aircraft={selectedAircraft}
        vessel={selectedVessel}
        event={selectedEvent}
        airDefense={selectedAD}
        installation={selectedInstallation}
        radar={selectedRadar}
        nuclear={selectedNuclear}
        onClose={clearSelections}
      />

      {/* Timeline — different component for live vs historical */}
      {isHistorical && theater.historical ? (
        <HistoricalTimeline
          visible={layers.events}
          startYear={theater.historical.startYear}
          endYear={theater.historical.endYear}
          onYearRangeChange={handleHistoricalYearChange}
          cumulativeFatalities={historicalFatalities}
        />
      ) : (
        <TimelineScrubber
          visible={layers.events}
          onRangeChange={setTimelineDaysBack}
        />
      )}

      {/* Bottom status bar */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-6 bg-tactical-dark/80 border border-tactical-border px-3 py-1.5 pointer-events-none">
        <span className="text-xs font-mono text-terminal-green/80 tracking-wider">THEATER: {theater.name.toUpperCase()}</span>
        {isHistorical && (
          <span className="text-xs font-mono text-terminal-amber tracking-wider">
            {historicalYearFilter
              ? historicalYearFilter.startYear === historicalYearFilter.endYear
                ? `YEAR: ${historicalYearFilter.startYear}`
                : `YEARS: ${historicalYearFilter.startYear}-${historicalYearFilter.endYear}`
              : `YEARS: ${theater.historical!.startYear}-${theater.historical!.endYear}`}
          </span>
        )}
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
