'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { pdf } from '@react-pdf/renderer';
import { getTheater } from '@/lib/theaters';
import { SitrepDocument } from '@/lib/pdf/SitrepDocument';
import type { BriefingResponse } from '@/lib/types/events';

interface BriefingPanelProps {
  theaterId: string;
  theaterName: string;
}

type OllamaStatus = 'checking' | 'available' | 'unavailable';
type BriefingState = 'idle' | 'generating' | 'ready' | 'error';

const SECTION_LABELS: { key: keyof BriefingResponse['sections']; label: string }[] = [
  { key: 'situation', label: 'SITUATION' },
  { key: 'enemyActivity', label: 'ENEMY ACTIVITY' },
  { key: 'friendlyActivity', label: 'FRIENDLY ACTIVITY' },
  { key: 'airActivity', label: 'AIR ACTIVITY' },
  { key: 'maritimeActivity', label: 'MARITIME ACTIVITY' },
  { key: 'assessment', label: 'ASSESSMENT' },
  { key: 'outlook', label: 'OUTLOOK' },
];

export function BriefingPanel({ theaterId, theaterName }: BriefingPanelProps) {
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>('checking');
  const [providerInfo, setProviderInfo] = useState<{ provider: string; model: string } | null>(null);
  const [state, setState] = useState<BriefingState>('idle');
  const [briefing, setBriefing] = useState<BriefingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState(24);
  const [selectedRegion, setSelectedRegion] = useState('theater'); // 'theater' or region id

  const theater = useMemo(() => getTheater(theaterId), [theaterId]);

  // Reset region when theater changes
  useEffect(() => {
    setSelectedRegion('theater');
  }, [theaterId]);

  // Get GeoConfirmed conflict slugs for this theater
  const theaterConflicts = useMemo(() => {
    if (!theater) return 'ukraine';
    const geoconSource = theater.dataSources.find(ds => ds.source === 'geoconfirmed');
    const conflicts = geoconSource?.params?.conflicts as string[] | undefined;
    return conflicts?.join(',') || 'ukraine';
  }, [theater]);

  // Get bounds for the selected scope
  const scopeBounds = useMemo(() => {
    if (!theater) return { adsb: [0, 0, 0, 0], maritime: [0, 0, 0, 0], label: theaterName };

    if (selectedRegion === 'theater') {
      const adsbSource = theater.dataSources.find(ds => ds.source === 'adsb');
      const aisSource = theater.dataSources.find(ds => ds.source === 'aisstream');
      return {
        adsb: (adsbSource?.params?.bbox as number[]) || theater.bounds,
        maritime: (aisSource?.params?.bbox as number[]) || theater.bounds,
        label: `${theater.name} Theater`,
      };
    }

    const region = theater.regions.find(r => r.id === selectedRegion);
    if (region) {
      return {
        adsb: region.bounds,
        maritime: region.bounds,
        label: `${region.name} (${theater.name})`,
      };
    }

    return { adsb: theater.bounds, maritime: theater.bounds, label: theater.name };
  }, [theater, theaterName, selectedRegion]);

  // Check Ollama availability on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/ollama-status');
        if (res.ok) {
          const data = await res.json();
          setOllamaStatus(data.available ? 'available' : 'unavailable');
          setProviderInfo({ provider: data.provider, model: data.model });
        } else {
          setOllamaStatus('unavailable');
        }
      } catch {
        setOllamaStatus('unavailable');
      }
    }
    checkStatus();
  }, []);

  const generateBriefing = useCallback(async () => {
    setState('generating');
    setError(null);

    try {
      const res = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theaterId,
          theaterName,
          theaterConflicts,
          timeframeHours: timeframe,
          adsbBounds: scopeBounds.adsb,
          maritimeBounds: scopeBounds.maritime,
          scopeLabel: scopeBounds.label,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Server returned ${res.status}`);
      }

      const data: BriefingResponse = await res.json();
      setBriefing(data);
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate briefing');
      setState('error');
    }
  }, [theaterId, theaterName, timeframe, scopeBounds]);

  const exportPdf = useCallback(async () => {
    if (!briefing) return;
    try {
      const blob = await pdf(<SitrepDocument briefing={briefing} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SITREP_${briefing.dtg.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  }, [briefing]);

  // Unavailable state
  if (ollamaStatus === 'unavailable') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center gap-3">
        <div className="text-terminal-red/60 text-2xl">&#x26A0;</div>
        <div className="text-sm font-mono text-tactical-text tracking-wider">BRIEFING GENERATOR OFFLINE</div>
        <div className="text-xs font-mono text-tactical-text-dim leading-relaxed max-w-[280px]">
          Ollama is not running. Install and start Ollama with a model to enable local briefing generation at no cost.
        </div>
        <a
          href="https://ollama.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-terminal-blue hover:text-terminal-blue/80 underline"
        >
          ollama.com
        </a>
        <button
          onClick={() => {
            setOllamaStatus('checking');
            fetch('/api/ollama-status')
              .then(r => r.json())
              .then(data => {
                setOllamaStatus(data.available ? 'available' : 'unavailable');
                setProviderInfo({ provider: data.provider, model: data.model });
              })
              .catch(() => setOllamaStatus('unavailable'));
          }}
          className="text-xs font-mono text-terminal-green/70 hover:text-terminal-green border border-tactical-border px-3 py-1 mt-1"
        >
          RETRY CONNECTION
        </button>
      </div>
    );
  }

  // Checking state
  if (ollamaStatus === 'checking') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm font-mono text-tactical-text-dim tracking-wider animate-pulse">
          CHECKING LLM STATUS...
        </div>
      </div>
    );
  }

  // Idle state — ready to generate
  if (state === 'idle') {
    return (
      <div className="flex flex-col h-full p-3 gap-3">
        <div className="flex items-center gap-2 text-xs font-mono text-tactical-text-dim">
          <span className="w-2 h-2 bg-terminal-green/80 rounded-full" />
          <span className="tracking-wider">
            {providerInfo?.provider?.toUpperCase()} — {providerInfo?.model}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-tactical-text-dim tracking-wider w-24">SCOPE:</label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="flex-1 bg-tactical-dark border border-tactical-border text-xs font-mono text-tactical-text px-2 py-1"
            >
              <option value="theater">FULL THEATER</option>
              {theater?.regions.map(r => (
                <option key={r.id} value={r.id}>{r.name.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-tactical-text-dim tracking-wider w-24">TIMEFRAME:</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(Number(e.target.value))}
              className="flex-1 bg-tactical-dark border border-tactical-border text-xs font-mono text-tactical-text px-2 py-1"
            >
              <option value={6}>6 HOURS</option>
              <option value={12}>12 HOURS</option>
              <option value={24}>24 HOURS</option>
              <option value={48}>48 HOURS</option>
              <option value={72}>72 HOURS</option>
            </select>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={generateBriefing}
            className="px-6 py-3 border border-terminal-green/50 text-sm font-mono text-terminal-green tracking-widest hover:bg-terminal-green/10 hover:border-terminal-green transition-colors"
          >
            GENERATE SITREP
          </button>
        </div>
      </div>
    );
  }

  // Generating state
  if (state === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="text-terminal-amber text-2xl animate-pulse">&#x2637;</div>
        <div className="text-sm font-mono text-terminal-amber tracking-wider animate-pulse">
          GENERATING SITREP...
        </div>
        <div className="text-xs font-mono text-tactical-text-dim">
          {scopeBounds.label} | {timeframe}h window
        </div>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 gap-3">
        <div className="text-terminal-red/60 text-2xl">&#x26A0;</div>
        <div className="text-sm font-mono text-terminal-red tracking-wider">GENERATION FAILED</div>
        <div className="text-xs font-mono text-tactical-text-dim text-center max-w-[280px]">{error}</div>
        <button
          onClick={() => setState('idle')}
          className="text-xs font-mono text-terminal-green/70 hover:text-terminal-green border border-tactical-border px-3 py-1 mt-1"
        >
          RETRY
        </button>
      </div>
    );
  }

  // Ready state — show briefing
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-tactical-border bg-tactical-surface/30">
        <div className="flex flex-col">
          <span className="text-xs font-mono text-terminal-green tracking-wider font-bold">
            {briefing?.title}
          </span>
          <span className="text-[11px] font-mono text-tactical-text-dim">
            DTG: {briefing?.dtg} | Sources: {briefing?.sourceCount}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportPdf}
            className="text-xs font-mono text-terminal-blue hover:text-terminal-blue/80 border border-tactical-border px-2 py-1"
          >
            PDF
          </button>
          <button
            onClick={() => { setState('idle'); setBriefing(null); }}
            className="text-xs font-mono text-tactical-text-dim hover:text-tactical-text border border-tactical-border px-2 py-1"
          >
            NEW
          </button>
        </div>
      </div>

      {/* Briefing content */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-3">
          {SECTION_LABELS.map(({ key, label }) => {
            const content = briefing?.sections[key];
            if (!content || content === 'No significant activity reported.') {
              return (
                <div key={key}>
                  <div className="text-xs font-mono text-terminal-amber/70 tracking-wider font-bold mb-1">
                    {label}:
                  </div>
                  <div className="text-xs font-mono text-tactical-text-dim italic">
                    No significant activity reported.
                  </div>
                </div>
              );
            }
            return (
              <div key={key}>
                <div className="text-xs font-mono text-terminal-amber/70 tracking-wider font-bold mb-1">
                  {label}:
                </div>
                <div className="text-xs font-mono text-tactical-text leading-relaxed whitespace-pre-wrap">
                  {content}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-2 border-t border-tactical-border">
          <div className="text-[11px] font-mono text-tactical-text-dim">
            {briefing?.classification} | Generated {briefing?.generatedAt?.substring(0, 16)} via {briefing?.provider}
          </div>
        </div>
      </div>
    </div>
  );
}
