# Auftragstaktik

## CRITICAL: Context Window Management
**Before the conversation runs out of context space (e.g., too many images or long exchanges), WARN the user immediately and update `SESSION_NOTES.md` with all current progress, decisions, and next steps BEFORE the conversation ends.** The user is not a programmer and cannot reconstruct lost context. Losing session state has happened before — do not let it happen again.

## Project Overview
Tactical OSINT command terminal for tracking military/conflict movements using open source data. Built as a passion project by a wargame designer. Features a "Tom Clancy terminal" aesthetic with real operational utility.

## Tech Stack
- **Next.js 15** (App Router, TypeScript, Tailwind CSS v4)
- **MapLibre GL JS** — vector map renderer (dark tactical basemap)
- **milsymbol** — NATO MIL-STD-2525 symbol rendering
- **Ollama** — local LLM for briefing generation (default, no API costs)
- **LLM abstraction** — Ollama (default), Claude, OpenAI, or any OpenAI-compatible API
- **@react-pdf/renderer** — PDF SITREP export
- **Dev server**: `npm run dev` (port 3117)

## Architecture
- **Theater system**: All data scoped to active theater config (Ukraine, Iran/ME, etc.)
- **LLM provider**: Abstracted in `src/lib/llm/` — swap providers via `.env.local`
- **API routes**: All external data fetched server-side, cached, served to client
- **TTL cache**: In-memory (`src/lib/data/cache.ts`)

## Data Sources
- DeepState (frontlines) — no key needed
- GeoConfirmed (conflict events) — no key needed, replaced ACLED as primary source
- adsb.lol (aircraft) — no key needed
- aisstream.io (maritime/AIS) — free API key via GitHub auth

## Key Directories
- `src/lib/theaters/` — Theater configs (bounding boxes, regions, data sources)
- `src/lib/llm/` — LLM provider abstraction
- `src/lib/data/` — API fetchers + cache
- `src/lib/symbols/` — milsymbol factory + SIDC mapper
- `src/lib/types/` — All TypeScript interfaces
- `src/components/layout/` — Dashboard shell, header, panels
- `src/components/map/` — Map layers, controls, legend, detail panel
- `src/components/feed/` — Intelligence feed, event cards, filters
- `src/components/briefing/` — SITREP briefing panel

## Conventions
- **Use stop-slop** when writing any human-facing copy (READMEs, docs, descriptions, briefing output)
- Session notes tracked in `SESSION_NOTES.md`
- Plan file: `.claude/plans/cosmic-marinating-lemur.md`
- All external API calls go through Next.js API routes (never from client directly)
- Use `@/*` import alias for src directory
- After clearing `.next` cache, always restart dev server (stale webpack chunks cause "Cannot find module './331.js'" errors)

## Current Status
- **Phase 0: Scaffolding** — COMPLETE
- **Phase 1: Tactical Map + Frontlines** — COMPLETE
- **Phase 2: Intelligence Feed** — COMPLETE (GeoConfirmed, 250+ events)
- **Phase 3: Aircraft Tracking** — COMPLETE (adsb.lol, NATO symbology)
- **Phase 4: Maritime/Naval Tracking** — COMPLETE (aisstream.io WebSocket)
- **Phase 5: Conflict Event Markers** — COMPLETE (NATO symbology + event type filters)
- **Phase 6: LLM Briefing Generator** — COMPLETE (Ollama default, slop filter, structured SITREP)
- **Phase 7: Bug Fixes + UX Polish** — COMPLETE (theater-scoped events, pulse markers, wiki links, news links)

**Next: Phase 8** — Theater Expansion + Help Menu + Accessibility
