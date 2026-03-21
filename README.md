# AUFTRAGSTAKTIK

**Tactical OSINT command terminal for tracking conflict movements, frontlines, and force deployments using open source intelligence data.**

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green)

---

## What This Does

Auftragstaktik pulls live data from open sources (frontline maps, aircraft transponders, ship tracking, conflict event databases) and renders it on a single tactical display with NATO military symbology. The data is real. The interface looks like something out of a Tom Clancy movie.

The name comes from the German military doctrine of *mission-type tactics*: give subordinates the objective and let them figure out the execution.

### Core Capabilities

**Live Tactical Map.** Dark-themed MapLibre map with real-time data layers. Frontlines from DeepState, aircraft from ADS-B, ships from AIS, conflict events from ACLED. All markers use proper MIL-STD-2525 NATO symbols.

**Intelligence Feed.** A scrolling event ticker that aggregates all data sources into a single stream. Deduplicated, severity-tagged, filterable. Click an event and the map flies to that location.

**Briefing Generator.** Point an LLM at the aggregated data and get back a structured SITREP. A slop filter strips AI writing patterns from the output before rendering it as a downloadable PDF.

---

## Screenshots

*Coming soon.*

---

## Data Sources

| Source | What It Tracks | Auth Required |
|--------|---------------|---------------|
| [DeepState](https://deepstatemap.live) | Frontline positions, occupied territory, unit deployments | No |
| [adsb.lol](https://adsb.lol) | Aircraft positions (ADS-B, includes military) | No |
| [aisstream.io](https://aisstream.io) | Ship positions (AIS), with military vessel classification | Free API key |
| [ACLED](https://acleddata.com) | Armed conflict events worldwide | Free registration |

All external API calls go through server-side routes. API keys stay on the server.

---

## Theater System

Each theater defines a geographic bounding box, sub-regions, and which data sources apply. The map view, data queries, feed filters, and briefings all scope to the active theater.

**Configured theaters:**
- **Ukraine:** Frontlines, aircraft, maritime (Black Sea), conflict events. Seven sub-regions including Donetsk, Kharkiv, and Crimea.
- **Iran / Middle East:** Aircraft, maritime (Persian Gulf, Strait of Hormuz), conflict events. Five sub-regions.

You add a new theater by writing a config object.

---

## LLM Provider Support

The briefing generator works with any LLM provider. Claude is the default. Switch providers by changing environment variables.

```env
LLM_PROVIDER=claude          # claude | openai | openai-compatible
LLM_API_KEY=your-key-here
LLM_MODEL=claude-sonnet-4-20250514
LLM_BASE_URL=                # only for openai-compatible
```

---

## Quick Start

```bash
git clone https://github.com/lerugray/auftragstaktik.git
cd auftragstaktik
npm install
cp .env.example .env.local
# Add your API keys to .env.local
npm run dev
```

Open `http://localhost:3117`.

---

## Tech Stack

- **Next.js 15** with App Router, TypeScript, server-side API routes
- **Tailwind CSS v4** for the dark tactical theme
- **MapLibre GL JS** for vector map rendering
- **milsymbol** for NATO MIL-STD-2525 military symbol generation
- **@anthropic-ai/sdk / openai** for LLM provider abstraction
- **@react-pdf/renderer** for PDF SITREP generation

---

## Project Status

- [x] Phase 0: Project scaffolding, theater system, LLM abstraction
- [x] Phase 1: Tactical map with DeepState frontline data
- [x] Phase 2: Intelligence feed (GeoConfirmed, 250+ verified events)
- [x] Phase 3: Aircraft tracking layer (ADS-B via adsb.lol, NATO symbology)
- [x] Phase 4: Maritime/naval layer (AIS via aisstream.io, vessel classification)
- [ ] Phase 5: Conflict event markers on map (NATO symbology for strikes/shelling)
- [ ] Phase 6: LLM briefing generator
- [ ] Phase 7: PDF SITREP export
- [ ] Phase 8: Visual polish and deployment

---

## License

MIT

---

*Built with [Claude Code](https://claude.ai/claude-code).*
