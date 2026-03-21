# AUFTRAGSTAKTIK

**Tactical OSINT terminal. Live frontlines, aircraft, ships, air defense coverage, and conflict events on a single display with NATO military symbology.**

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green)

---

## What This Does

Auftragstaktik pulls live data from open sources and renders it on a tactical map. Frontline positions from DeepState. Aircraft transponders from ADS-B. Ship tracking from AIS. Conflict events from GeoConfirmed. Translated military blog posts from Telegram. All markers use MIL-STD-2525 NATO symbols.

The name comes from the German doctrine of mission-type tactics: give the objective, let subordinates figure out execution.

### Core Capabilities

**Live Tactical Map.** Dark or light MapLibre basemap with togglable data layers. Frontlines, aircraft, ships, air defense installations with range rings, conflict events, and density heatmap. Click any marker for detail panels with Wikipedia links and metadata.

**Intelligence Feed.** Scrolling event stream from GeoConfirmed and Telegram channels (auto-translated). Severity-tagged, filterable by source and type. Click an event to fly the map there with a pulsing indicator. Export filtered data as JSON or CSV.

**Briefing Generator.** Feeds aggregated OSINT data to a local LLM (Ollama) and produces a structured SITREP. Slop filter strips AI writing patterns. Export as PDF with military-style formatting. No API costs.

**Air Defense Layer.** OSINT-confirmed SAM/AD installations (S-400, Patriot, Iron Dome, etc.) with engagement range rings showing coverage zones and gaps.

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
| OSINT databases | Air defense installations (S-400, Patriot, Iron Dome positions) | None (curated) |

All external calls go through server-side routes. Keys stay on the server.

---

## Theaters

Six theaters with 37 sub-regions. Each scopes the map, data sources, feed, and briefings.

- **Ukraine** — Frontlines (DeepState), aircraft, Black Sea maritime, conflict events, Telegram blogs
- **Middle East** — Israel/Gaza, Lebanon, Syria, Iran, Yemen. Persian Gulf and Red Sea maritime
- **Baltic / N. Europe** — Kaliningrad, Baltic Sea, Finland border, Norwegian Coast
- **East Asia / Pacific** — Korean Peninsula, Taiwan Strait, South China Sea
- **Africa** — Sahel, Horn of Africa, Sudan, DR Congo, Libya, Mozambique
- **Myanmar** — Shan, Kachin, Rakhine, Sagaing conflict zones

Add a new theater by writing a config object in `src/lib/theaters/index.ts`.

---

## Setup

### Prerequisites

- **Node.js 18+** — Download from [nodejs.org](https://nodejs.org). Pick the LTS version. Run the installer, accept defaults.
- **Git** — Download from [git-scm.com](https://git-scm.com). Run the installer, accept defaults.
- **Ollama** (optional, for briefings) — Download from [ollama.com](https://ollama.com). Run the installer.

### Step-by-step

1. **Open a terminal.** On Windows, press `Win+R`, type `cmd`, hit Enter. On Mac, open Terminal from Applications.

2. **Clone the repository:**
   ```bash
   git clone https://github.com/lerugray/auftragstaktik.git
   cd auftragstaktik
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```
   This downloads all required packages. Takes 1-2 minutes.

4. **Create your environment file.** In the `auftragstaktik` folder, create a file called `.env.local` with this content:
   ```env
   AISSTREAM_API_KEY=your-key-here
   ```
   Get a free API key at [aisstream.io](https://aisstream.io) (sign in with GitHub). This enables ship tracking. Everything else works without keys.

5. **Start the app:**
   ```bash
   npm run dev
   ```

6. **Open your browser** to `http://localhost:3117`.

### Enable briefings (optional)

The SITREP briefing generator runs on Ollama, a free local AI runtime. Without it, everything else still works — you just can't generate briefings.

1. Install Ollama from [ollama.com](https://ollama.com)
2. Open a new terminal and run:
   ```bash
   ollama pull llama3
   ```
3. Keep Ollama running in the background. The briefing panel will auto-detect it.

### Troubleshooting

- **"Cannot find module" errors** — Delete the `.next` folder and restart: `rm -rf .next && npm run dev`
- **Port 3117 in use** — Another instance is running. Close it or use `npx kill-port 3117`
- **No ship data** — Make sure your `.env.local` has a valid `AISSTREAM_API_KEY`
- **No aircraft near conflict zones** — Airspace is often closed in active war zones. Aircraft show around the edges (Poland, Romania, Turkey for Ukraine)

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Toggle frontlines |
| `2` | Toggle aircraft |
| `3` | Toggle air defense |
| `4` | Toggle heatmap |
| `5` | Toggle maritime |
| `6` | Toggle events |
| `Esc` | Close detail panel |

---

## Briefing Generator

The SITREP generator runs on [Ollama](https://ollama.com), a local LLM runtime. No API keys, no costs. The panel auto-detects whether Ollama is running.

```bash
ollama pull llama3
```

Select a scope (full theater or sub-region), timeframe, and click GENERATE SITREP. Export the result as a formatted PDF.

Cloud providers (Claude, OpenAI) also work if configured, but they charge per-token. Ollama is the default for a reason.

---

## Tech Stack

- **Next.js 15** — App Router, TypeScript, server-side API routes
- **Tailwind CSS v4** — Dark tactical theme + light/high-contrast mode
- **MapLibre GL JS** — Vector map rendering with heatmap support
- **milsymbol** — NATO MIL-STD-2525 symbol generation
- **Ollama** — Local LLM briefing generation (free)
- **@react-pdf/renderer** — PDF SITREP export
- **translatte** — Telegram post translation (Russian/Ukrainian to English)

---

## License

MIT

---

*Built with [Claude Code](https://claude.ai/claude-code).*
