# Auftragstaktik

## Project Overview
Tactical OSINT command terminal for tracking military/conflict movements using open source data. Built as a passion project by a wargame designer. Features a "Tom Clancy terminal" aesthetic with real operational utility.

## Tech Stack
- **Next.js 15** (App Router, TypeScript, Tailwind CSS v4)
- **MapLibre GL JS** — vector map renderer (dark tactical basemap)
- **milsymbol** — NATO MIL-STD-2525 symbol rendering
- **LLM abstraction** — Claude (default), OpenAI, Gemini, or any OpenAI-compatible API
- **@react-pdf/renderer** — PDF SITREP export
- **Dev server**: `npm run dev` (port 3117)

## Architecture
- **Theater system**: All data scoped to active theater config (Ukraine, Iran/ME, etc.)
- **LLM provider**: Abstracted in `src/lib/llm/` — swap providers via `.env.local`
- **API routes**: All external data fetched server-side, cached, served to client
- **TTL cache**: In-memory (`src/lib/data/cache.ts`)

## Data Sources
- DeepState (frontlines) — no key needed
- adsb.lol (aircraft) — no key needed
- aisstream.io (maritime/AIS) — free API key
- ACLED (conflict events) — free registration

## Key Directories
- `src/lib/theaters/` — Theater configs (bounding boxes, regions, data sources)
- `src/lib/llm/` — LLM provider abstraction
- `src/lib/data/` — API fetchers + cache
- `src/lib/types/` — All TypeScript interfaces
- `src/components/layout/` — Dashboard shell, header, panels
- `src/components/map/` — Map layers and controls (Phase 1+)

## Conventions
- **Use stop-slop** when writing any human-facing copy (READMEs, docs, descriptions, briefing output)
- Session notes tracked in `SESSION_NOTES.md`
- Plan file: `.claude/plans/cosmic-marinating-lemur.md`
- All external API calls go through Next.js API routes (never from client directly)
- Use `@/*` import alias for src directory

## Current Status
**Phase 0: Scaffolding** — COMPLETE
- Dashboard skeleton with tactical dark theme
- Theater selector (Ukraine + Iran/ME)
- UTC clock, classification banners, status indicators
- LLM provider abstraction (Claude/OpenAI/compatible)
- All TypeScript types defined

**Next: Phase 1** — Tactical Map + DeepState Frontlines
