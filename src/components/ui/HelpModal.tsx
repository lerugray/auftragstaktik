'use client';

import { useEffect, useCallback } from 'react';

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

export function HelpModal({ open, onClose }: HelpModalProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-tactical-panel border border-tactical-border max-w-[600px] w-full max-h-[80vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-tactical-border bg-tactical-surface/50">
          <h2 className="text-sm font-mono text-terminal-green tracking-widest">AUFTRAGSTAKTIK — HELP</h2>
          <button
            onClick={onClose}
            className="text-tactical-text-dim hover:text-tactical-text text-sm font-mono px-2"
          >
            ESC
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          <HelpSection title="WHAT IS THIS">
            <p>
              A tactical OSINT terminal that tracks live conflict data from open sources. Aircraft transponders,
              ship positions, frontline movements, and verified conflict events render on a single map
              with NATO military symbology. The data is real.
            </p>
          </HelpSection>

          <HelpSection title="DATA SOURCES">
            <table className="w-full text-sm">
              <tbody>
                <HelpRow label="DEEPSTATE" desc="Ukrainian frontline positions and occupied territory. Updates daily." />
                <HelpRow label="GEOCONFIRMED" desc="Geolocated, verified conflict events. Strikes, shelling, vehicle losses, troop movements." />
                <HelpRow label="ADS-B" desc="Live aircraft positions via adsb.lol. Military and civilian. 10-second refresh." />
                <HelpRow label="AIS" desc="Ship positions via aisstream.io. Military vessel classification by MMSI and type code." />
                <HelpRow label="TELEGRAM" desc="Military blog posts from public Telegram channels (Rybar, DeepState UA, WarGonzo). Auto-translated to English." />
              </tbody>
            </table>
          </HelpSection>

          <HelpSection title="TACTICAL MAP">
            <ul className="space-y-1">
              <li>Use the <Hl>LAYERS</Hl> panel on the right to toggle frontlines, aircraft, air defense, maritime, and events.</li>
              <li>Click any marker to open its detail panel (bottom-left). Aircraft types and vessel classes link to Wikipedia.</li>
              <li>The <Hl>AIR DEFENSE</Hl> layer shows publicly confirmed SAM/AD installations (S-400, Patriot, Iron Dome, etc.) with engagement range rings.</li>
              <li>The <Hl>INSTALLATIONS</Hl> layer shows known military bases, naval ports, HQs, and strategic chokepoints (Hormuz, Bab el-Mandeb, Suez, Malacca).</li>
              <li>The <Hl>RADAR / SENSORS</Hl> layer shows early warning radars (Voronezh, Green Pine), theater radars, and coastal surveillance systems with detection and tracking range rings in purple.</li>
              <li>The <Hl>NUCLEAR / CBRN</Hl> layer marks known nuclear facilities (reactors, enrichment plants, weapons sites, test sites) with yellow exclusion zones. CBRN-related keywords in events auto-escalate to critical severity.</li>
              <li>Use <Hl>EVENT FILTER</Hl> to show or hide specific event types (missiles, drones, artillery, etc.).</li>
              <li>The <Hl>LEGEND</Hl> button (bottom-right) explains every symbol on the map. Expand <Hl>NATO SYMBOL REFERENCE</Hl> for the full icon set.</li>
            </ul>
          </HelpSection>

          <HelpSection title="INTELLIGENCE FEED">
            <ul className="space-y-1">
              <li>Scrolling feed of all conflict events and Telegram posts, sorted by time.</li>
              <li>Filter by source (<Hl>GEOCON</Hl>, <Hl>TGRAM</Hl>, etc.) or severity level.</li>
              <li>Click any GeoConfirmed event to fly the map to that location. The target marker pulses so you can find it.</li>
              <li>Click any Telegram post to open the original message in a new tab.</li>
              <li>Event detail panels include a <Hl>NEWS COVERAGE</Hl> link to relevant reporting.</li>
            </ul>
          </HelpSection>

          <HelpSection title="THEATERS">
            <p>
              Each theater covers a geographic region with its own data sources and sub-regions.
              Switch theaters using the dropdown next to the title. Available theaters:
            </p>
            <ul className="space-y-0.5 mt-1">
              <li><Hl>Ukraine</Hl> — Frontlines, aircraft, Black Sea maritime, conflict events</li>
              <li><Hl>Middle East</Hl> — Israel/Gaza, Syria, Yemen, Iran. Aircraft, Persian Gulf/Red Sea maritime</li>
              <li><Hl>Baltic / N. Europe</Hl> — Kaliningrad, Baltic Sea, Finland border monitoring</li>
              <li><Hl>East Asia / Pacific</Hl> — Korean Peninsula, Taiwan Strait, South China Sea</li>
              <li><Hl>Africa</Hl> — Sahel, Horn of Africa, Sudan, DR Congo</li>
              <li><Hl>Myanmar</Hl> — Shan, Kachin, Rakhine conflict zones</li>
            </ul>
          </HelpSection>

          <HelpSection title="BRIEFING GENERATOR">
            <ul className="space-y-1">
              <li>Generates a structured SITREP from all active data sources using a local AI model.</li>
              <li>Requires <Hl>Ollama</Hl> running locally (free, no API costs). Install from ollama.com, then run <Hl>ollama pull llama3</Hl>.</li>
              <li>Select a <Hl>SCOPE</Hl> (full theater or a specific sub-region) and <Hl>TIMEFRAME</Hl>, then click <Hl>GENERATE SITREP</Hl>.</li>
              <li>Output follows standard military format: Situation, Enemy Activity, Friendly Activity, Air, Maritime, Assessment, Outlook.</li>
            </ul>
          </HelpSection>

          <HelpSection title="KEYBOARD SHORTCUTS">
            <table className="w-full text-sm">
              <tbody>
                <HelpRow label="1-9" desc="Toggle map layers (1=Frontlines, 2=Aircraft, 3=Air Defense, 4=Installations, 5=Radar, 6=Nuclear, 7=Heatmap, 8=Maritime, 9=Events)" />
                <HelpRow label="ESC" desc="Close detail panel" />
              </tbody>
            </table>
          </HelpSection>

          <HelpSection title="DATA EXPORT">
            <ul className="space-y-1">
              <li>Click <Hl>JSON</Hl> or <Hl>CSV</Hl> in the feed header to download filtered events.</li>
              <li>Click <Hl>PDF</Hl> on a generated SITREP to download a formatted briefing document.</li>
            </ul>
          </HelpSection>

          <HelpSection title="CLASSIFICATION">
            <p>
              All data shown is <Hl>UNCLASSIFIED // OSINT</Hl>. Every source is publicly accessible.
              No classified or restricted data is used.
            </p>
          </HelpSection>

        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-tactical-border text-[11px] font-mono text-tactical-text-dim">
          Built with Claude Code. Source at github.com/lerugray/auftragstaktik
        </div>
      </div>
    </div>
  );
}

function HelpSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-mono text-terminal-amber tracking-widest font-bold mb-1.5">{title}</h3>
      <div className="text-sm font-mono text-tactical-text leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function HelpRow({ label, desc }: { label: string; desc: string }) {
  return (
    <tr>
      <td className="text-terminal-green/80 pr-3 py-0.5 align-top whitespace-nowrap">{label}</td>
      <td className="text-tactical-text py-0.5">{desc}</td>
    </tr>
  );
}

function Hl({ children }: { children: React.ReactNode }) {
  return <span className="text-terminal-green/90">{children}</span>;
}
