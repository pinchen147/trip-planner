# Spots Auto-Discovery

Automatically populate eat/bar/cafes/go out/shops spots for any city using Firecrawl AI extraction from curated list URLs.

## Architecture

```
Trip Creation (POST /api/trips)
  └─ fire-and-forget: discoverSpotsIfNeeded(cityId)

POST /api/spots/discover { cityId, force? }
  └─ discoverSpotsIfNeeded(cityId)
       ├─ Check Convex: spots exist? → return cached (no-op)
       ├─ Load spot sources for city (or fallback to Corner.inc default)
       ├─ For each source URL:
       │    ├─ Validate URL (security)
       │    ├─ Call Firecrawl /v1/extract (async polling)
       │    └─ _normalizeSpots() → tag inference, dedup, ID generation
       ├─ _dedupeAndSortSpots() → cross-source dedup
       ├─ _enrichPlacesWithCoordinates() → geocode missing lat/lng
       └─ saveSpotsToConvex(cityId, spots)
```

## Files

| File | Role |
|------|------|
| `lib/firecrawl-spots.ts` | Firecrawl API client — schema, prompt, extract + poll |
| `lib/events.ts` | `syncSpotsFromSources()` — orchestrates extraction per source; `discoverSpotsIfNeeded()` — top-level entry point with cache check |
| `app/api/spots/discover/route.ts` | POST endpoint with rate limiting + concurrency guard |
| `app/api/trips/route.ts` | Auto-triggers discovery on trip creation |
| `convex/spots.ts` | `upsertSpots` mutation — dedup, missed-sync tracking, soft-delete |

## API

### `POST /api/spots/discover`

**Body:** `{ cityId: string, force?: boolean }`

**Response:** `{ spotCount: number, syncedAt: string, errors: any[], cached: boolean }`

- Returns `cached: true` if spots already exist (no Firecrawl call)
- Pass `force: true` to re-scrape even if cached
- Rate limited: 5 requests/min per IP
- Concurrent requests for the same city are deduped

## Spot Sources

Sources are managed per city in the config page (sourceType: `'spot'`). If no sources are configured, falls back to:

1. `SPOT_SOURCE_URLS` env var (comma-separated)
2. Default Corner.inc list: `https://www.corner.inc/list/e65af393-70dd-46d5-948a-d774f472d2ee`

Any curated list URL works — Corner.inc, Eater, Infatuation, Time Out, etc. Firecrawl's AI extraction handles the page structure automatically.

## Firecrawl Extraction

**Endpoint:** `POST https://api.firecrawl.dev/v1/extract`

The prompt asks for: name, tag (eat/bar/cafes/go out/shops), location, map URL, source link, curator comment, description, details.

Async jobs are polled at 1.5s intervals with a 60s timeout.

## Tag Inference

If the source doesn't provide an explicit tag, regex patterns infer it:

- `coffee|cafe|espresso|matcha|tea|bakery` → `cafes`
- `bar|cocktail|wine|pub|brewery` → `bar`
- `shop|store|boutique|retail|market` → `shops`
- `club|night|party|dance|music venue` → `go out`
- Default fallback → `eat`

## Caching & Cost Control

| Layer | Strategy |
|-------|----------|
| City-level | Skip Firecrawl entirely if Convex already has spots for this city |
| Concurrency | `inFlightByCity` map dedupes parallel requests for same city |
| Rate limit | 5 req/min per IP on the discover endpoint |
| Geocode | Cached in Convex `geocodeCache` table (24hr TTL) |

Firecrawl costs ~$0.05 per extraction. A city with one source URL costs one extraction. Cached cities cost nothing on repeat visits.

## Env Vars

```
FIRECRAWL_API_KEY=...          # Required for spot extraction
GOOGLE_MAPS_GEOCODING_KEY=...  # Optional, for coordinate enrichment
SPOT_SOURCE_URLS=...           # Optional, comma-separated fallback URLs
```
