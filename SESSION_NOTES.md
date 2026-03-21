# Session Notes

## Session 1 — 2026-03-21
- Conceptualized Auftragstaktik as a tactical OSINT terminal
- Researched data sources: DeepState, adsb.lol, aisstream.io, ACLED
- Researched key libraries: MapLibre GL JS, milsymbol, react-pdf
- Designed full implementation plan (9 phases, 0-8)
- Key architectural decisions:
  - Theater system for scaling to multiple conflict zones (Ukraine + Iran/ME configured)
  - LLM provider abstraction (works with any AI provider — Claude, OpenAI, Gemini, Ollama, etc.)
  - Maritime vessel classification (MMSI + AIS type codes + known warship DB)
  - stop-slop for cleaning AI-generated briefings, react-pdf for PDF SITREPs

### Phase 0: Scaffolding — COMPLETE
- Next.js 15 project initialized manually (npm naming restriction workaround)
- Dark tactical theme with Tailwind CSS v4 custom color palette
- 3-panel layout: map (65%) | feed (35% top) + briefing (35% bottom)
- Classification banners ("UNCLASSIFIED // OSINT"), UTC clock, theater selector
- Status indicators for each data source (FRONTLINE, ADS-B, AIS, ACLED)
- TypeScript types for all data models (EventRecord, Aircraft, Maritime, ACLED, Briefing)
- Theater configs: Ukraine (7 regions) + Iran/Middle East (5 regions)
- LLM abstraction: ClaudeProvider, OpenAICompatibleProvider — swap via .env.local
- TTL cache system for API responses
- Dev server running on port 3117

### Phase 1: Tactical Map + Frontlines — COMPLETE
- MapLibre GL JS with CartoDB Dark Matter basemap
- DeepState live API integration (`/api/history/last`) with GitHub fallback
- 525 features rendering: 28 occupied (red), 29 contested (gray), 1 Transnistria (purple), ~467 unit deployment zones (orange at zoom 6+)
- Fixed: API response nested under `map` key — needed unwrapping
- Layer controls panel (toggle frontlines, aircraft, maritime, events)
- Bottom status bar with theater name, zoom level, mouse coordinates
- Theater switching: fly-to animation when changing between Ukraine and Iran/ME

### UI Polish
- Removed Next.js dev toolbar (was overlapping map)
- Bumped all text sizes for readability (panels, banners, status indicators, layer controls)
- Styled MapLibre nav controls to match dark theme
- Added proper dark background box for map status bar

### Next: Phase 2 — Intelligence Feed
