# AI Itinerary Generator

> **Last Updated:** 2026-03-16

## Overview

The AI Itinerary Generator allows users to paste raw travel content (blog posts, social media posts, wishlists, notes) and automatically generate structured events and spots for their trip using Claude AI.

## User Flow

1. Navigate to the **SOURCES** tab
2. Paste travel content into the textarea (supports Chinese, English, Japanese, etc.)
3. Click "Generate Itinerary"
4. AI generates events (time-bound activities) and spots (permanent venues)
5. Items are saved to the database and appear in the Events list on the PLANNING tab
6. User drags items into the day plan calendar

## API Endpoint

`POST /api/ai/parse`

### Request

```json
{
  "text": "Travel content to generate from...",
  "cityId": "san-francisco",
  "cityName": "San Francisco"
}
```

### Response

```json
{
  "eventCount": 3,
  "spotCount": 5,
  "warning": "optional warning message"
}
```

### Validation

- `text`: Required, max 50,000 characters
- `cityId`: Required
- Auth: Owner role required (via `runWithOwnerClient`)

## Claude Prompt

Uses `claude-sonnet-4-20250514` with temperature 0 for deterministic output.

**Classification rules:**
- **Event**: Time-bound activity (concerts, tours, reservations, flights, day trips)
- **Spot**: Permanent venue/place (restaurants, cafes, shops, attractions)

**Output fields:**
- Events: name, description, startDateISO, startDateTimeText, locationText, address
- Spots: name, tag (eat/bar/cafes/go out/shops), location, description, details, curatorComment

## Data Mapping

### Events → Convex `events:upsertEvents`

| AI Field | Convex Field |
|----------|-------------|
| id | id (SHA-256 hash of name+date+location) |
| name | name |
| description | description |
| startDateISO | startDateISO |
| eventUrl | `ai-parsed://{id}` |
| sourceId | `ai-parse` |

### Spots → Convex `spots:upsertSpots`

| AI Field | Convex Field |
|----------|-------------|
| id | id (SHA-256 hash of name+location) |
| name | name |
| tag | tag |
| location | location |
| sourceUrl | `ai-parsed://text-input` |

## Stable ID Generation

IDs are generated as `sha256(fields.join("||")).slice(0, 16)`. Events use `name + date + location`, spots use `name + location`. This prevents duplicates when re-generating from the same content.

## Limitations

- Max input: 50,000 characters
- Date extraction depends on explicit mentions in text
- Tag classification (eat/bar/cafes/go out/shops) is best-effort
- Requires `ANTHROPIC_API_KEY` environment variable
- Confidence score set to 0.8 for AI-generated items (vs 1.0 for calendar sources)
