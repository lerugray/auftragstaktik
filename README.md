# AUFTRAGSTAKTIK

**Tactical OSINT terminal. Live frontlines, aircraft, ships, and conflict events on a single dark-themed display with NATO military symbology.**

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green)

---

## What This Does

Auftragstaktik pulls live data from open sources and renders it on a tactical map. Frontline positions from DeepState. Aircraft transponders from ADS-B. Ship tracking from AIS. Conflict events from GeoConfirmed. All markers use MIL-STD-2525 NATO symbols.

The name comes from the German doctrine of mission-type tactics: give the objective, let subordinates figure out execution.

### Core Capabilities

**Live Tactical Map.** Dark MapLibre basemap with togglable data layers. Frontlines, aircraft, ships, conflict events. Click any marker for detail panels with full metadata.

**Intelligence Feed.** Scrolling event stream aggregated from all sources. Deduplicated, severity-tagged, filterable by source and type. Click an event to fly the map there.

**Briefing Generator.** Feeds aggregated OSINT data to a local LLM (Ollama) and produces a structured SITREP. A slop filter strips AI writing patterns before display. No API costs.

---

## Screenshots

*Coming soon.*

---

## Data Sources

| Source | Tracks | Auth |
|--------|--------|------|
| [DeepState](https://deepstatemap.live) | Frontline positions, occupied territory, unit deployments | None |
| [GeoConfirmed](https://geoconfirmed.org) | Verified conflict events (strikes, shelling, clashes) | None |
| [adsb.lol](https://adsb.lol) | Aircraft positions via ADS-B, including military | None |
| [aisstream.io](https://aisstream.io) | Ship positions via AIS, military vessel classification | Free API key |
| Telegram channels | Military blog posts (Rybar, DeepState UA, WarGonzo), auto-translated | None |

All external calls go through server-side routes. Keys stay on the server.

---

## Theater System

Each theater defines a bounding box, sub-regions, and active data sources. Map view, queries, feed, and briefings all scope to the active theater.

**Configured theaters:**
- **Ukraine:** Frontlines (DeepState), aircraft, maritime (Black Sea), conflict events
- **Middle East:** Israel/Gaza, Lebanon, Syria, Iran, Yemen. Persian Gulf and Red Sea maritime
- **Baltic / N. Europe:** Kaliningrad, Baltic Sea, Finland border, Norwegian Coast
- **East Asia / Pacific:** Korean Peninsula, Taiwan Strait, South China Sea
- **Africa:** Sahel, Horn of Africa, Sudan, DR Congo, Libya, Mozambique
- **Myanmar:** Shan, Kachin, Rakhine, Sagaing conflict zones

Add a new theater by writing a config object.

---

## Briefing Generator

The SITREP generator runs on [Ollama](https://ollama.com), a local LLM runtime. No API keys, no costs. Install Ollama, pull a model, and the briefing panel activates.

```bash
# Install Ollama from https://ollama.com, then:
ollama pull llama3
```

The panel auto-detects whether Ollama is running. If not, it shows setup instructions. Click "GENERATE SITREP" to produce a structured briefing from current intelligence data. Output runs through a slop filter to strip AI writing patterns.

Cloud providers (Claude, OpenAI) also work if you configure them, but they charge per-token through their own billing. Ollama is the default for a reason.

```env
# Default: Ollama (free, local)
LLM_PROVIDER=ollama
LLM_MODEL=llama3

# Optional: cloud providers (separate API billing applies)
# LLM_PROVIDER=claude
# LLM_API_KEY=your-key-here
# LLM_MODEL=claude-sonnet-4-20250514
```

---

## Quick Start

```bash
git clone https://github.com/lerugray/auftragstaktik.git
cd auftragstaktik
npm install
cp .env.example .env.local
# Add your aisstream.io API key to .env.local
npm run dev
```

Open `http://localhost:3117`.

For briefings, install [Ollama](https://ollama.com) and run `ollama pull llama3`.

---

## Tech Stack

- **Next.js 15** with App Router, TypeScript, server-side API routes
- **Tailwind CSS v4** for the dark tactical theme
- **MapLibre GL JS** for vector map rendering
- **milsymbol** for NATO MIL-STD-2525 symbol generation
- **Ollama** for local LLM briefing generation (no API costs)
- **@anthropic-ai/sdk / openai** for optional cloud LLM providers
- **@react-pdf/renderer** for PDF SITREP export (planned)

---

## Project Status

- [x] Phase 0: Project scaffolding, theater system, LLM abstraction
- [x] Phase 1: Tactical map with DeepState frontline data
- [x] Phase 2: Intelligence feed (GeoConfirmed, 250+ verified events)
- [x] Phase 3: Aircraft tracking (ADS-B via adsb.lol, NATO symbology)
- [x] Phase 4: Maritime/naval tracking (AIS via aisstream.io, vessel classification)
- [x] Phase 5: Conflict event markers on map (NATO symbology, event type filters)
- [x] Phase 6: LLM briefing generator (Ollama, slop filter, structured SITREP)
- [x] Phase 7: Theater-scoped events fix, pulse markers, equipment wiki links, news links
- [x] Phase 8: Theater expansion (6 theaters), help menu, light/high-contrast theme
- [x] Phase 9: Telegram integration (translated military blogs), static AD/SAM layer
- [x] Phase 10: PDF SITREP export, range rings, heatmap, timeline, keyboard shortcuts, data export

---

## License

MIT

---

*Built with [Claude Code](https://claude.ai/claude-code).*
