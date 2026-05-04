# HTTP API contracts

Server-side Next.js route handlers under `src/app/api/`. All responses use `Content-Type: application/json` unless noted.

## Common conventions

- **JSON**: Every route returns JSON bodies suitable for `response.json()`.
- **Graceful degradation (partial)**: Several **GET** data routes prefer empty collections or empty GeoJSON over surfacing upstream failures to the client. Timeouts and zod validation failures on those paths typically yield **HTTP 200** with empty or partial data plus **`console.error`** lines (prefixes like `upstream:…`, `telegram:…`, `aisstream:…`). This matches the boundary validation (auft-003) and upstream timeout work (auft-005); maritime adds collector retry/backoff (auft-007).
- **Not all routes are “always 200”**: Some handlers still return **4xx/5xx** for programmer errors, LLM availability, or unexpected server failures—see each endpoint’s **Failure modes**.
- **CORS**: No custom CORS middleware or `Access-Control-Allow-Origin` configuration was found. Browsers treat these routes as **same-origin** when the app calls `/api/...` from the deployed Next host. Cross-origin browser calls without a proxy are not explicitly supported.
- **Auth**: No end-user API keys or session checks on routes. **Server env** gates some upstreams: `AISSTREAM_API_KEY` (maritime), `ACLED_EMAIL` / `ACLED_PASSWORD` (ACLED), and LLM provider settings for `/api/briefing` and `/api/ollama-status`.

---

### GET /api/events

Aggregates **GeoConfirmed** placemarks (per conflict slug) and optional **Telegram** preview posts into deduplicated, sorted `EventRecord` rows.

**Query parameters**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `conflicts` | string | no | `ukraine` | Comma-separated GeoConfirmed conflict slugs (e.g. `ukraine`, `israel`). Each slug is passed to `fetchGeoConfirmedEvents`. |
| `telegram` | string | no | _(empty)_ | Comma-separated Telegram channel usernames (e.g. `DeepStateUA`). Scrapes public `t.me/s/...` previews via `fetchMultipleChannels`. |
| `severity` | string | no | _(none)_ | Comma-separated severities (`critical`, `high`, `medium`, `low`, `info`) to filter the merged list. |

**Response shape**

Wrapper object (not a bare array):

```ts
type EventsApiResponse = {
  events: EventRecord[];  // src/lib/types/events.ts
  count: number;
  sources: {
    geoconfirmed: { status: 'connected'; eventCount: number };
    telegram: { status: 'connected' | 'disabled'; eventCount: number };
  };
};
```

- **GeoConfirmed → zod**: Raw placemarks are validated with **`GeoConfirmedEventSchema`** (`src/lib/data/schemas.ts`) before `normalizeGeoConfirmedEvents` produces `EventRecord`.
- **Telegram**: Built inline in the route into `EventRecord`; **no** zod schema at this boundary.

**Cache TTL** (in-memory `src/lib/data/cache.ts`, via fetchers—not the route file)

| Subsystem | TTL | Where |
|-----------|-----|--------|
| GeoConfirmed placemarks | **10 minutes** | `src/lib/data/geoconfirmed.ts` (`CACHE_TTL`), key `geoconfirmed-{conflict}-{pages}`. |
| Telegram posts | **5 minutes** | `src/lib/data/telegram.ts` (`CACHE_TTL`), key `telegram-{channelName}`. |
| Telegram translation snippets | **30 minutes** | `telegram.ts` (`TRANSLATION_CACHE_TTL`), key `tg-translated-…`. |

**Failure modes**

- **Per-conflict GeoConfirmed timeout** (`AbortSignal.timeout(10_000)`): logs `upstream:geoconfirmed timeout: 10s exceeded`; that slug contributes no rows; other slugs continue.
- **Per-conflict GeoConfirmed zod failure**: logs `upstream:geoconfirmed validation failed:` + issues; **`continue`** (that slug skipped).
- **Other GeoConfirmed fetch errors**: `console.error` with slug; that slug skipped.
- **Upstream non-OK / empty pages** (inside `fetchGeoConfirmedEvents`): paging stops for that conflict; partial data may be cached.
- **Telegram** (via `fetchTelegramChannel`): per-channel **10s** fetch timeout; **404** / “channel not found” HTML → `[]` for that channel with `telegram: channel not found:` or `telegram: preview fetch failed:`; **429** → `telegram: rate-limited:`; other errors → `telegram: fetch error:`; translation errors log `telegram: translate failed:` and fall back to original text.
- **Telegram block in route `catch`**: logs `Failed to fetch Telegram posts:`; other sources unaffected.
- **Outer route `catch`**: **502** JSON `{ error: 'Failed to fetch aggregated events' }`.

**Source attribution**

- GeoConfirmed — [geoconfirmed.org](https://geoconfirmed.org); respect their terms.
- Telegram — public preview pages only; content belongs to channel operators.

---

### GET /api/historical

Loads bundled **UCDP GED**-derived events from `public/data/ucdp-ged-filtered.json`, filters by country list and year range, validates, normalizes to `EventRecord`, optional severity filter, then sorts.

**Query parameters**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `countries` | string | yes† | `''` | Comma-separated country names matching decoded GED rows (e.g. from theater presets). †If empty after trim, response is empty with `sources.ucdp.status: 'error'`. |
| `startYear` | number | no | `2000` | Lower bound (also used if `filterStartYear` omitted). |
| `endYear` | number | no | `2023` | Upper bound (also used if `filterEndYear` omitted). |
| `filterStartYear` | number | no | — | Overrides `startYear` for the filter window when present. |
| `filterEndYear` | number | no | — | Overrides `endYear` for the filter window when present. |
| `severity` | string | no | _(none)_ | Comma-separated `Severity` values; applied after normalization. |

**Response shape**

```ts
type HistoricalApiResponse = {
  events: EventRecord[];       // src/lib/types/events.ts — from UCDP via normalizer
  count: number;
  totalUcdpEvents: number;     // 0 if zod validation of the filtered UCDP slice failed
  sources: {
    ucdp: { status: 'connected' | 'error'; eventCount: number };
  };
};
```

- **zod**: Filtered raw rows are validated with **`UcdpEventSchema`** (`src/lib/data/schemas.ts`) before `normalizeUCDPEvents`. Authoritative field list for decoded UCDP-shaped objects is that schema (see also `src/lib/data/ucdpGed.ts`).

**Cache TTL**

- **Route**: Decoded GED array is held in a **module-level `_cache`** for the Node process lifetime (no expiry in `cache.ts`).
- **Note**: `src/lib/data/ucdpGed.ts` also defines `cacheGet`/`cacheSet` TTLs for a different loader path; **`/api/historical` does not use that cache**—it reads and decodes the JSON file in-route.

**Failure modes**

- **Empty `countries`**: **200** with `{ events: [], count: 0, sources: { ucdp: { status: 'error', eventCount: 0 } } }` (no `totalUcdpEvents` key in that branch—caller should treat as zero).
- **Zod validation failure** on the filtered slice: logs `upstream:ucdp validation failed:`; `events` stays `[]`, `totalUcdpEvents` is `0`, `sources.ucdp.status` remains **`'connected'`** with `eventCount: 0` (loaded data rejected).
- **File read / parse errors** in `loadGedData` or outer `catch`: **502** `{ error: 'Failed to fetch historical events' }`.

**Source attribution**

- [UCDP GED](https://ucdp.uu.se) — CC BY 4.0 where applicable.

---

### POST /api/briefing

Builds a structured SITREP by calling internal **`/api/events`**, **`/api/aircraft`**, and **`/api/maritime`** in parallel, then runs the configured LLM (`getLLMProvider()`).

**Request body** (JSON)

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `theaterId` | string | **yes** | — | Identifier for logging/context. |
| `theaterName` | string | **yes** | — | Display name in output. |
| `theaterConflicts` | string | no | — | Passed to `/api/events?conflicts=…` (fallback `ukraine` if omitted). |
| `timeframeHours` | number | no | `24` | Prompt window hint. |
| `adsbBounds` | number[] | no | `[0,0,0,0]` | Four numbers → `bounds` query on aircraft API. |
| `maritimeBounds` | number[] | no | `[0,0,0,0]` | Four numbers → `bounds` query on maritime API. |
| `scopeLabel` | string | no | — | Overrides display name in title/prompt when set. |

**Response shape**

On success: **`BriefingResponse`** (`src/lib/types/events.ts`) — `title`, `dtg`, `classification`, `sections` (situation, enemyActivity, friendlyActivity, airActivity, maritimeActivity, assessment, outlook), `generatedAt`, `sourceCount`, `provider`.

- **No** dedicated zod schema in `schemas.ts` for the briefing JSON; shape is the TypeScript interface above.

**Cache TTL**

- None in this route; downstream GET caches apply as documented on those routes.

**Failure modes**

- **400**: Missing `theaterId` or `theaterName` — `{ error: 'Missing theaterId or theaterName' }`.
- **503** (Ollama only): `checkOllamaAvailable()` false — `{ error: 'Ollama is not running. Start Ollama to generate briefings.' }`.
- **500**: Uncaught generation error — `{ error: <message> }`.
- Internal fetches use `Promise.allSettled`; non-OK or failed child requests yield **empty arrays** for that slice (silent degradation into the prompt), not HTTP errors on the briefing response.

---

### GET /api/aircraft

Live aircraft in and near a bounding box via **adsb.lol** (`fetchAircraftData`).

**Query parameters**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `bounds` | string | no | `22.0,44.0,40.5,52.5` | `west,south,east,north` (CSV) → `[number, number, number, number]`. |

**Response shape**

```ts
type AircraftApiResponse = {
  aircraft: AircraftRecord[];  // aligns with AdsbAircraftSchema / src/lib/types/events.ts
  count: number;
  military: number;
  timestamp: string;         // ISO when response built
};
```

- **zod**: **`AdsbAircraftSchema`** array (`src/lib/data/schemas.ts`) on the normalized rows returned by `fetchAircraftData`.

**Cache TTL**

- **10 seconds** — `src/lib/data/adsb.ts` (`CACHE_TTL`), single key `adsb-aircraft` (global, not per-bounds).

**Failure modes**

- **Upstream timeout** (10s on `fetchAircraftData`): logs `upstream:adsb timeout: 10s exceeded`; **200** with `aircraft: []`, `count: 0`, `military: 0`, `timestamp` set.
- **Zod validation failure**: logs `upstream:adsb validation failed:`; **200** with `aircraft: []` (same counts).
- **Other errors**: **502** `{ error: 'Failed to fetch aircraft data' }`.

**Source attribution**

- [adsb.lol](https://adsb.lol) — follow their acceptable use / attribution expectations.

---

### GET /api/maritime

Vessel positions from the **AISStream** WebSocket collector (`fetchMaritimeData`), with optional post-filter.

**Query parameters**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `bounds` | string | no | `27.0,40.0,42.0,47.0` | `west,south,east,north` CSV. |
| `filter` | string | no | `all` | `all` \| `naval` (military, law-enforcement, coast-guard) \| `flagged` (excludes merchant and unknown). |

**Response shape**

```ts
type MaritimeApiResponse = {
  vessels: MaritimeRecord[];   // aligns with AisstreamMaritimeSchema / src/lib/types/events.ts
  count: number;
  military: number;
  storeSize: number;           // in-memory store size from collector module
  timestamp: string;
};
```

- **zod**: **`AisstreamMaritimeSchema`** array (`src/lib/data/schemas.ts`), including `classification` enum.

**Cache TTL**

- **90 seconds** — `src/lib/data/aisstream.ts` (`CACHE_TTL`), key `aisstream-vessels`.

**Upstream / collector behavior** (auft-007, `aisstream.ts`)

- Retries up to **3** disconnects with backoff **1s / 2s / 4s** (`RETRY_BACKOFF_MS`, `MAX_RETRIES`).
- Child process hard kill after **60s** if stuck: logs `aisstream: child timeout: 60s exceeded, killing`.
- Inner WebSocket closes after **10s** per collector script (`INNER_WS_CLOSE_MS`).
- Missing `AISSTREAM_API_KEY`: fetcher returns **`[]`** (no throw).

**Failure modes**

- **Route-level wait** `raceUpstreamTimeout(…, 90_000)`: on abort, logs `upstream:aisstream timeout: 90s exceeded`; continues with `vesselsRaw = []`.
- **Zod validation failure**: logs `upstream:aisstream validation failed:`; `vessels` becomes `[]` after filter step on that empty/partial set.
- **Other errors**: **502** `{ error: 'Failed to fetch maritime data' }`.

**Source attribution**

- [AISStream](https://aisstream.io) — API key required server-side.

---

### GET /api/deepstate

Returns **DeepState** frontline GeoJSON (`FeatureCollection`). Live API with GitHub daily fallback is implemented in `fetchDeepStateData`.

**Query parameters**

None.

**Response shape**

- Validated with **`DeepStateFrontlineSchema`** (`src/lib/data/schemas.ts`) — `FeatureCollection` with **`DeepStateFeatureSchema`** features (geometry `Polygon` | `MultiPolygon`). Extra keys allowed (`.passthrough()`).

**Cache TTL**

- **1 hour** — `src/lib/data/deepstate.ts` (`CACHE_TTL`), key `deepstate-frontlines`.

**Failure modes**

- **Zod validation failure**: logs `upstream:deepstate validation failed:`; **200** with empty FeatureCollection `{ type: 'FeatureCollection', features: [] }`.
- **Timeout** (10s signal on fetch): logs `upstream:deepstate timeout: 10s exceeded`; **200** with the same empty FeatureCollection.
- **Other errors** (e.g. both live and fallback fail): **502** `{ error: 'Failed to fetch frontline data' }`.

**Source attribution**

- [DeepStateMap](https://deepstatemap.live) and fallback dataset — comply with their licensing/terms.

---

### GET /api/telegram

Telegram-only feed normalized to `EventRecord` (same shape as the Telegram branch of `/api/events`). Does **not** hit GeoConfirmed.

**Query parameters**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `channels` | string | **yes**† | `''` | Comma-separated channel names. †If missing/empty: **200** `{ events: [], count: 0 }`. |

**Response shape**

```ts
type TelegramApiResponse = {
  events: EventRecord[];
  count: number;
};
```

- **No** zod validation on this route; normalization mirrors `/api/events` Telegram mapping.

**Cache TTL**

Same as Telegram branch in `/api/events`: **5 minutes** posts, **30 minutes** translation snippets (`src/lib/data/telegram.ts`).

**Failure modes**

- Per-channel behavior matches **`fetchTelegramChannel`** (timeouts, 404, 429, logs as under `/api/events`).
- **Route `catch`**: **502** `{ error: 'Failed to fetch Telegram data' }`.

---

### GET /api/acled

Legacy **ACLED API** (OAuth + REST) via `fetchACLEDData`. Requires server credentials.

**Query parameters**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `country` | string | no | `Ukraine` | Passed to ACLED fetcher. |
| `days` | number | no | `7` | Lookback window for API query. |

**Response shape**

```ts
type AcledApiResponse = {
  events: ACLEDRecord[];  // src/lib/types/events.ts — no zod schema in schemas.ts
  count: number;
};
```

**Cache TTL** (`src/lib/data/acled.ts`)

- Event rows: **15 minutes** (`CACHE_TTL`), key `acled-{country}-{days}`.
- OAuth token: **23 hours** (`TOKEN_TTL`), key `acled-oauth-token`.

**Failure modes**

- Missing `ACLED_EMAIL` / `ACLED_PASSWORD`: fetcher throws → **502** `{ error: 'Failed to fetch conflict event data' }`.
- Token or API failure: thrown from fetcher → **502** same message.
- **No** zod boundary validation on this route (unlike GeoConfirmed/ADS-B/AIS/DeepState).

---

### GET /api/ollama-status

Operational check for **LLM provider readiness** (not a tactical data feed). Used to see if Ollama is reachable or if a cloud key is configured.

**Query parameters**

None.

**Response shape**

- If `getLLMConfig().provider !== 'ollama'`: `{ available: boolean, provider, model }` where `available` is **`!!config.apiKey`**.
- If provider **is** `ollama`: `{ available: boolean, provider: 'ollama', model }` with `available` from `checkOllamaAvailable()`.

**Cache TTL**

None.

**Failure modes**

- Does not throw on “unavailable”; returns JSON with `available: false` when Ollama is down. Unexpected exceptions would surface as a Next.js **500** (no explicit `try/catch` in route).

---

## Schema quick reference

| Schema | File | Typical consumer route |
|--------|------|-------------------------|
| `GeoConfirmedEventSchema` | `src/lib/data/schemas.ts` | `/api/events` (GeoConfirmed path) |
| `UcdpEventSchema` | `src/lib/data/schemas.ts` | `/api/historical` |
| `AdsbAircraftSchema` | `src/lib/data/schemas.ts` | `/api/aircraft` |
| `AisstreamMaritimeSchema` | `src/lib/data/schemas.ts` | `/api/maritime` |
| `DeepStateFrontlineSchema` / `DeepStateFeatureSchema` | `src/lib/data/schemas.ts` | `/api/deepstate` |

Normalized **`EventRecord`** and related app types: **`src/lib/types/events.ts`**.

---

## Endpoints intentionally not listed as “primary”

All existing `src/app/api/*/route.ts` handlers are documented above. Nothing was excluded as dev-only: **`/api/ollama-status`** is included as a small operator-facing status route rather than a tactical layer.
