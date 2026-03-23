# Session Notes

## Session 1 — 2026-03-21
- Conceptualized Auftragstaktik as a tactical OSINT terminal
- Researched data sources: DeepState, adsb.lol, aisstream.io, ACLED, GeoConfirmed, GDELT
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

### Phase 2: Intelligence Feed — COMPLETE
- ACLED API investigated — requires institutional email for API access (free tier blocks it)
- Switched to GeoConfirmed as primary conflict event source (free, no auth, 53K+ events)
- GeoConfirmed data fetcher with icon parsing (faction, event type, destroyed status)
- Event normalizer with severity tagging (critical/high/medium/low/info)
- Spatial + temporal deduplication across sources
- Scrolling feed with severity badges, DTG timestamps, source tags
- Filter bar: toggle by source and severity level
- Click any event to fly the map to that location
- 30-second auto-refresh polling
- ACLED OAuth integration preserved as fallback (needs institutional email)

### Phase 3: Aircraft Tracking — COMPLETE
- adsb.lol API (free, no auth) — 273+ aircraft in Ukraine theater
- Military aircraft detection via squawk codes and type inference
- milsymbol factory generating MIL-STD-2525 NATO air symbols
- Red diamonds for military, blue for civilian aircraft
- Click any aircraft for detail panel (ICAO, type, altitude, speed, heading, v/s)
- Hover tooltips with callsign and key data
- Merges area search + global military endpoint for complete coverage
- Works across both theaters (Ukraine + Iran/ME)
- 10-second polling interval

### Phase 4: Maritime/Naval Tracking — COMPLETE
- aisstream.io WebSocket API (free, GitHub auth for API key)
- Key challenge: WebSocket `ws` module doesn't work inside Next.js webpack bundle
- Solution: Child process spawns a standalone Node.js script that connects to WebSocket,
  collects AIS data for 10 seconds, writes to temp JSON file, parent reads results
- Key bug found: bounding box needed triple-nesting `[[[lat,lon],[lat,lon]]]` not double
- Vessel classification: military (type 35), law-enforcement (55), coast-guard (58),
  auxiliary (50-59), merchant (60-89), fishing (30), unknown
- Diamond markers for naval, circles for civilian vessels
- Click for detail panel (MMSI, callsign, speed, heading, destination, classification)
- 90-second cache between collections
- Most military vessels have AIS transponders off in conflict zones (expected)

### Phase 5: Conflict Event Markers — COMPLETE
- GeoConfirmed events now render as NATO symbols on the tactical map
- SIDC mapper converts event types to MIL-STD-2525 symbol codes
- milsymbol renders hostile (red) markers with correct iconography
- Event types: missile strikes, drone strikes, artillery/shelling, explosions,
  armed clashes, tank/vehicle destroyed, fire/smoke, fortifications
- Click any event marker for detail panel with severity, type, description, coordinates
- Collapsible map legend with NATO symbol reference dropdown
- Event type sub-filters: toggle individual event types on/off (missiles, drones, artillery, etc.)
- Fallback to colored diamond markers if SIDC rendering fails

### UI Polish Applied Throughout
- Removed Next.js dev toolbar (was overlapping map) via `devIndicators: false`
- Bumped all text sizes for readability (panels, banners, status indicators, layer controls)
- Styled MapLibre nav controls to match dark theme
- Added proper dark background box for map status bar
- Hid MapLibre attribution button
- Collapsible legend with NATO symbol reference

### Known Issues / Notes
- ACLED free tier blocks API access (needs institutional email) — using GeoConfirmed instead
- Ukrainian airspace closed — aircraft show around edges (Poland, Romania, Turkey)
- Military vessels rarely broadcast AIS in conflict zones
- Stale `.next` cache causes "Cannot find module './331.js'" — fix: `rm -rf .next` + restart
- User is not a programmer — do things for them rather than giving instructions
- Use stop-slop when writing any human-facing copy

### Git Repo
- https://github.com/lerugray/auftragstaktik
- All commits pushed to master

## Session 2 — 2026-03-21

### Bug Fixes
- Fixed blue X markers on map — GeoConfirmed 'Aircraft' (icon 40) and 'Naval' (icon 60) event types had no SIDC mapping, fell through to default Unknown (blue) ground unit symbol
  - Added 'Aircraft' → SHAP---------- and 'Naval' → SHSPCL-------- to sidcMapper.ts
  - Changed default SIDC from Unknown (U=blue) to Hostile (H=red) so unmapped types render consistently
- Fixed legend mismatch — military/civilian aircraft legend items showed simple diamonds but map renders NATO milsymbol frames (red pentagon for military, blue rectangle for civilian). Legend now uses actual milsymbol renderings for aircraft entries

### Phase 6: LLM Briefing Generator — COMPLETE
- Key decision: **Ollama (local LLM) as default** instead of Claude API
  - Claude API charges per-token through separate billing (console.anthropic.com), NOT against Max subscription
  - Ollama runs models locally for free — no API costs, no internet needed
  - User has Ollama installed with llama3 model
- LLM provider updated: defaults to Ollama (localhost:11434/v1), falls back to cloud if configured
- Prompt builder (`src/lib/llm/promptBuilder.ts`): assembles events, aircraft, vessels into structured context
- Slop filter (`src/lib/llm/slopFilter.ts`): strips AI writing patterns from output
- API routes: `/api/briefing` (POST, generates SITREP), `/api/ollama-status` (GET, checks availability)
- BriefingPanel UI (`src/components/briefing/BriefingPanel.tsx`):
  - Auto-detects Ollama availability on mount
  - Shows setup instructions with link to ollama.com if not running
  - Timeframe selector (6h / 12h / 24h / 48h / 72h)
  - Manual trigger only — "GENERATE SITREP" button, never auto-generates
  - Structured display: SITUATION, ENEMY ACTIVITY, FRIENDLY ACTIVITY, AIR ACTIVITY, MARITIME ACTIVITY, ASSESSMENT, OUTLOOK
  - DTG header, source count, provider info, classification banner
- README updated with Ollama instructions, GeoConfirmed as data source, Phase 6 checked off

### Phase 7: Bug Fixes + UX Polish — COMPLETE

#### 7A: Fixed theater-scoped events bug
- GeoConfirmed API uses lowercase conflict slugs (`ukraine`, `israel`, `syria`, `yemen`, `iran`), not country names
- Theater configs now store `conflicts: ['slug1', 'slug2']` arrays instead of `country: 'Name'`
- Events API accepts `?conflicts=ukraine` or `?conflicts=israel,syria,yemen,iran` (comma-separated)
- Updated all consumers: IntelFeed, ConflictEventLayer, briefing API route
- Faction map made generic (blue=defending, red=attacking) instead of hardcoded Ukraine/Russia
- Renamed Iran/ME theater to "Middle East" with expanded regions (Israel/Gaza, Lebanon, Syria, Yemen, Red Sea)
- Header status indicator renamed ACLED → GEOCON

#### 7B: Flashing map indicator on event click
- CSS `@keyframes pulse-ring` animation (amber expanding ring, 4 pulses over 4 seconds)
- Extended `MapHandle` with `highlightEvent(eventId)` method
- `TacticalMap` tracks `highlightedEventId` state, passes to `ConflictEventLayer`
- `ConflictEventLayer` adds `marker-pulse` class to matching marker, auto-clears after 4s
- `DashboardShell.handleEventClick` calls both `flyTo` and `highlightEvent`

#### 7C: Equipment Wikipedia links
- Created `src/lib/data/wikiLinks.ts` with ~140 aircraft type mappings and ~18 vessel class mappings
- Covers military (US, European, Russian), all major commercial (Airbus A3xx, Boeing 7xx, Embraer, Bombardier), business jets, and general aviation
- Smart fallback: manufacturer prefix matching (e.g., unknown "A" codes search "Airbus..." instead of vague "A388 aircraft")
- Uses Wikipedia Special:Search for fallback instead of broken w/index.php search
- `DetailRow` component updated to accept `ReactNode` values (not just strings)
- Aircraft TYPE field links to Wikipedia article for that type
- Vessel CLASS field links to Wikipedia article for that class
- Unknown types fall back to Wikipedia search URL

#### 7D: News/source links on events
- Conflict event detail panel now includes "NEWS COVERAGE" link
- Links to Google News search scoped to event type + title keywords

### Phase 8: Theater Expansion + Help + Accessibility — COMPLETE

#### 8A: Theater expansion
- Added 4 new theaters: Baltic / N. Europe, East Asia / Pacific, Africa, Myanmar
- Baltic: Kaliningrad, Baltic Sea, Finland/Russia border, Baltic States, Norwegian Coast
- East Asia: Korean Peninsula, Taiwan Strait, South China Sea, East China Sea, Sea of Japan
- Africa: Sahel, Horn of Africa, Sudan, DR Congo, Libya, Mozambique
- Myanmar: Shan, Kachin, Rakhine, Sagaing conflict zones
- All theaters have ADS-B, AIS, and GeoConfirmed data sources configured
- Total: 6 theaters with 37 sub-regions

#### 8B: Help menu
- HELP button in header opens modal overlay
- Sections: What is this, Data Sources, Tactical Map, Intelligence Feed, Theaters, Briefing Generator, Classification
- Written with stop-slop rules — no filler, no AI patterns
- Escape key or backdrop click to close
- CLAUDE.md updated: help menu must be updated with stop-slop when adding new features

#### 8C: Light/high-contrast theme
- LIGHT/DARK toggle button in header
- Light theme: high-contrast colors, light backgrounds, dark text, WCAG AA compliant
- Map basemap swaps between CartoDB Dark Matter and CartoDB Positron
- Scanline overlay hidden in light mode
- Theme preference persisted in localStorage
- Files: theme.ts, globals.css (light overrides), map/styles.ts (light basemap), DashboardShell (theme state)

### Phase 9: Telegram Integration + AD/SAM Layer — COMPLETE

#### 9A: Telegram channel integration
- Scrapes public Telegram preview pages (`t.me/s/{channel}`) directly — RSSHub public instance was returning 403
- Auto-translates Russian/Ukrainian text to English via `translatte` npm package
- Gazetteer with 30+ conflict-zone locations (Ukraine, Middle East, Myanmar) for geo-tagging posts
- `[TGRAM]` source tag and filter in intel feed
- Clicking a TGRAM event opens the original Telegram post in a new tab
- Ukraine theater configured with: Rybar, DeepState UA, WarGonzo
- Signal integration investigated — not feasible (E2E encrypted, no public channels)

#### 9B: Static air defense / SAM layer
- 18 curated installations across Ukraine, Middle East, Baltic theaters
- Systems: S-400, S-300, Patriot, NASAMS, IRIS-T, Iron Dome, David's Sling
- NATO ground AD symbols (friendly blue, hostile red) on map, togglable via AIR DEFENSE layer
- Detail panel: system type (Wikipedia link), operator, location, status, last confirmed date, source citation
- Added AD symbols to NATO Symbol Reference in legend

#### Other fixes this phase
- NATO Symbol Reference now renders aircraft with correct colors (red military, blue civilian)
- Legend label updated: "Civilian / commercial aircraft"
- Filter bar source label fixed: ACLED → GEOCON
- Help menu text bumped to text-sm for readability
- Help menu updated with Telegram, air defense, and filter instructions

### Phase 10: PDF Export + Advanced Features — COMPLETE

#### 10A: PDF SITREP export
- `@react-pdf/renderer` generates formatted PDF from BriefingResponse
- Military-style layout: classification banners (top/bottom), DTG, sections, footer
- "PDF" button appears in briefing header when SITREP is ready
- Downloads as `SITREP_{DTG}.pdf`

#### 10B: AD range rings
- Each air defense installation now renders its engagement envelope as a circle on the map
- S-400: 400km, S-300: 200km, Patriot: 160km, Iron Dome: 70km, NASAMS/IRIS-T: 40km, David's Sling: 300km
- Friendly rings in blue, hostile in red, dashed borders, low-opacity fill
- Shows overlapping coverage zones and gaps at a glance
- Range shown in detail panel on click

#### 10C: Event heatmap mode
- Toggle "HEATMAP" in layer controls to show event density overlay
- MapLibre native heatmap layer, severity-weighted (critical=1.0, info=0.2)
- Color ramp: blue → cyan → green → yellow → orange → red
- Zoom-responsive radius and intensity

#### 10D: Timeline scrubber
- Bar at bottom of map with 24H / 3D / 7D / 14D / 30D / ALL buttons
- Filters conflict event markers by age
- Works with the event type filters (both apply simultaneously)

#### 10E: Keyboard shortcuts
- 1-6 keys toggle map layers (Frontlines, Aircraft, Air Defense, Heatmap, Maritime, Events)
- Escape closes detail panel
- Ignores key presses when focused on input/select elements

#### 10F: Data export
- JSON and CSV export buttons in intel feed header
- Exports currently filtered events (respects source/severity filters)
- CSV with headers: id, source, timestamp, eventType, severity, title, lat, lng

## Session 3 — 2026-03-22

### Phase 11A: Briefing Data Enrichment — COMPLETE
- Created `src/lib/llm/eventAggregator.ts` with 6 aggregation functions:
  - `groupByLocation` — groups events by nearest gazetteer location (25km haversine match)
  - `aggregateFactions` — counts hostile/friendly/unknown activity
  - `aggregateEquipmentLosses` — rolls up confirmed destroyed equipment by type
  - `clusterByTime` — identifies sustained activity clusters (3+ events in 2h window)
  - `pickTopDescriptions` — top verified event descriptions by severity
  - `pickTelegramExcerpts` — top Telegram posts with channel attribution
- Added `reverseGeoLookup()` to gazetteer.ts for mapping coordinates to named locations
- Rewrote prompt builder events section: location summaries, faction breakdown, equipment losses, temporal clusters, verified intel quotes, Telegram excerpts with source reliability notes
- System prompt updated to weight GeoConfirmed (verified) over Telegram (unconfirmed)

### Phase 11B: Historical Mode — SCOPED (not implemented)
- UCDP GED recommended: 1989-2024, global, geocoded, CC BY 4.0, covers Yugoslav Wars
- GDELT (1979+), HCED (1468 BC-2003), ACLED, Correlates of War also available
- Architecture scoped: static CSV bundles, historical theater flag, timeline playback
- Estimated 2-3 sessions to implement

### Docker Deployment — COMPLETE
- Dockerfile with multi-stage build (deps → builder → runner), standalone output
- docker-compose.yml with app + Ollama sidecar, volume for model persistence
- .dockerignore, updated .env.example
- README updated with Docker setup instructions (Option B)
- Stop-slop pass on all docs

### README Branding
- Added Cold War tactical terminal hero image at top of README
- Centered title block with expanded tagline
- Capabilities reformatted as feature grid table
- Additional badges (MapLibre, Ollama)

### Future Features Noted
- Historical mode (UCDP GED dataset, Yugoslav Wars, timeline playback, 2-3 sessions)
- Data model normalization cleanup (per senior dev feedback)
