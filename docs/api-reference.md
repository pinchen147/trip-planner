# API Reference

> **Last Updated:** 2026-03-16

This document provides a centralized reference for all REST API endpoints in Trip Planner.

---

## Overview

The Trip Planner API consists of 14 REST endpoints built on Next.js Route Handlers. All endpoints use JSON for request/response bodies.

### Base URL

- **Local Development:** `http://localhost:3000/api`
- **Production:** `https://your-domain.com/api`

### Authentication

Most endpoints require authentication via Convex Auth. The auth token is passed automatically via cookies set during magic-link sign-in.

| Auth Level | Description |
|------------|-------------|
| **None** | Public access |
| **Authenticated** | Any signed-in user |
| **Owner** | User with `role: 'owner'` in `userProfiles` table |

### Rate Limiting

Some endpoints have IP-based rate limits (sliding window):

| Endpoint | Limit |
|----------|-------|
| `POST /api/route` | 40 requests/min |
| `GET /api/crime` | 30 requests/min |
| `POST /api/geocode` | 25 requests/min |

---

## Endpoints

### Authentication & Profile

#### GET /api/me

Get the current user's profile.

**Auth:** Authenticated

**Response:**
```json
{
  "authenticated": true,
  "profile": {
    "userId": "abc123",
    "role": "owner",
    "email": "user@example.com"
  }
}
```

---

### Trip Management

#### GET /api/trips

List all trips for the authenticated user.

**Auth:** Authenticated

**Response:**
```json
{
  "trips": [
    {
      "_id": "trip_abc123",
      "urlId": "sf-march-2026",
      "userId": "user_xyz",
      "name": "San Francisco",
      "legs": [
        {
          "cityId": "san-francisco",
          "startDate": "2026-03-15",
          "endDate": "2026-03-20"
        }
      ],
      "createdAt": "2026-03-10T10:00:00.000Z",
      "updatedAt": "2026-03-10T10:00:00.000Z"
    }
  ]
}
```

#### POST /api/trips

Create a new trip. Auto-provisions cities if not already in the database.

**Auth:** Authenticated

**Request:**
```json
{
  "name": "London Trip",
  "legs": [
    {
      "cityId": "london",
      "startDate": "2026-04-01",
      "endDate": "2026-04-05"
    }
  ]
}
```

**Response:**
```json
{
  "trip": {
    "_id": "trip_def456",
    "urlId": "london-trip",
    "name": "London Trip",
    "legs": [...],
    "createdAt": "2026-03-16T12:00:00.000Z"
  }
}
```

#### GET /api/trips/[tripId]

Get a single trip by ID.

**Auth:** Authenticated (owner or pair room member)

**Response:**
```json
{
  "trip": { ... }
}
```

#### PATCH /api/trips/[tripId]

Update a trip.

**Auth:** Owner

**Request:**
```json
{
  "name": "Updated Name",
  "legs": [...]
}
```

#### DELETE /api/trips/[tripId]

Delete a trip and all associated data (config, planner entries, pair rooms).

**Auth:** Owner

**Response:**
```json
{
  "deleted": true
}
```

---

### City Management

#### GET /api/cities

List all available cities.

**Auth:** Authenticated

**Response:**
```json
{
  "cities": [
    {
      "_id": "city_abc",
      "slug": "san-francisco",
      "name": "San Francisco",
      "timezone": "America/Los_Angeles",
      "locale": "en-US",
      "mapCenter": { "lat": 37.7749, "lng": -122.4194 },
      "mapBounds": { "north": 37.85, "south": 37.68, "west": -122.55, "east": -122.33 },
      "crimeAdapterId": "sf-open-data"
    }
  ]
}
```

#### POST /api/cities

Create a new city.

**Auth:** Owner

**Request:**
```json
{
  "slug": "boston",
  "name": "Boston",
  "timezone": "America/New_York",
  "locale": "en-US",
  "mapCenter": { "lat": 42.3601, "lng": -71.0589 },
  "mapBounds": { "north": 42.4, "south": 42.3, "west": -71.2, "east": -70.9 },
  "crimeAdapterId": ""
}
```

#### GET /api/cities/timezone

Look up timezone for coordinates using Google TimeZone API.

**Auth:** Authenticated

**Query Parameters:**
- `lat` (required): Latitude
- `lng` (required): Longitude

**Response:**
```json
{
  "timezone": "America/Los_Angeles"
}
```

---

### Trip Configuration

#### GET /api/config

Get trip configuration.

**Auth:** Authenticated

**Query Parameters:**
- `tripId` (required): Trip ID

**Response:**
```json
{
  "mapsBrowserKey": "AIza...",
  "mapsMapId": "abc123",
  "tripStart": "2026-03-15",
  "tripEnd": "2026-03-20",
  "baseLocation": "123 Main St, San Francisco",
  "timezone": "America/Los_Angeles"
}
```

#### POST /api/config

Update trip configuration.

**Auth:** Owner

**Request:**
```json
{
  "tripId": "trip_abc123",
  "tripStart": "2026-03-15",
  "tripEnd": "2026-03-22",
  "baseLocation": "456 Market St"
}
```

---

### Events & Places

#### GET /api/events

Get events and places for a city.

**Auth:** Authenticated

**Query Parameters:**
- `cityId` (required): City slug

**Response:**
```json
{
  "meta": {
    "syncedAt": "2026-03-16T10:00:00.000Z",
    "eventCount": 42,
    "spotCount": 15
  },
  "events": [
    {
      "id": "evt_123",
      "cityId": "san-francisco",
      "name": "Tech Meetup",
      "startDateISO": "2026-03-17",
      "startDateTimeText": "6:00 PM",
      "locationText": "Salesforce Tower",
      "lat": 37.7897,
      "lng": -122.3972,
      "eventUrl": "https://lu.ma/tech-meetup"
    }
  ],
  "places": [
    {
      "id": "spot_456",
      "name": "Blue Bottle Coffee",
      "tag": "cafes",
      "location": "Ferry Building",
      "lat": 37.7955,
      "lng": -122.3937
    }
  ]
}
```

---

### Sync Engine

#### POST /api/sync

Trigger a full sync of events and spots from configured sources.

**Auth:** Owner

**Request:**
```json
{
  "cityId": "san-francisco"
}
```

**Response:**
```json
{
  "meta": {
    "syncedAt": "2026-03-16T12:00:00.000Z",
    "calendars": ["https://lu.ma/cal/..."],
    "eventCount": 45,
    "spotCount": 20,
    "ingestionErrors": []
  },
  "events": [...],
  "places": [...]
}
```

---

### Source Management

#### GET /api/sources

List data sources for a city.

**Auth:** Owner

**Query Parameters:**
- `cityId` (required): City slug

**Response:**
```json
{
  "sources": [
    {
      "_id": "src_abc",
      "cityId": "san-francisco",
      "sourceType": "event",
      "url": "https://lu.ma/cal/...",
      "label": "Luma SF Tech",
      "status": "active",
      "lastSyncedAt": "2026-03-16T10:00:00.000Z"
    }
  ]
}
```

#### POST /api/sources

Create a new data source.

**Auth:** Owner

**Request:**
```json
{
  "cityId": "san-francisco",
  "sourceType": "event",
  "url": "https://lu.ma/cal/new-calendar",
  "label": "New Calendar"
}
```

#### PATCH /api/sources/[sourceId]

Update a source (label, status).

**Auth:** Owner

**Request:**
```json
{
  "label": "Updated Label",
  "status": "paused"
}
```

#### POST /api/sources/[sourceId]

Trigger sync for a single source.

**Auth:** Owner

**Response:**
```json
{
  "syncedAt": "2026-03-16T12:00:00.000Z",
  "events": [...],
  "errors": []
}
```

#### DELETE /api/sources/[sourceId]

Delete a source.

**Auth:** Owner

**Response:**
```json
{
  "deleted": true
}
```

---

### Planner

#### GET /api/planner

Get planner state for a trip/room.

**Auth:** Authenticated

**Query Parameters:**
- `tripId` (required): Trip ID
- `roomCode` (optional): Pair room code (defaults to personal planner)

**Response:**
```json
{
  "userId": "user_abc",
  "roomCode": "self:user_abc",
  "memberCount": 1,
  "plannerByDateMine": {
    "2026-03-17": [
      {
        "id": "plan-xyz",
        "kind": "event",
        "sourceKey": "https://lu.ma/...",
        "title": "Tech Meetup",
        "startMinutes": 1080,
        "endMinutes": 1170
      }
    ]
  },
  "plannerByDatePartner": {},
  "plannerByDateCombined": {...}
}
```

#### POST /api/planner

Save planner state (full replace for current user).

**Auth:** Authenticated

**Request:**
```json
{
  "tripId": "trip_abc",
  "cityId": "san-francisco",
  "roomCode": "pair123",
  "plannerByDate": {
    "2026-03-17": [...]
  }
}
```

**Response:**
```json
{
  "userId": "user_abc",
  "roomCode": "pair123",
  "dateCount": 3,
  "itemCount": 8,
  "updatedAt": "2026-03-16T12:00:00.000Z"
}
```

---

### Pair Rooms

#### GET /api/pair

List pair rooms for a trip.

**Auth:** Authenticated

**Query Parameters:**
- `tripId` (required): Trip ID

**Response:**
```json
{
  "rooms": [
    {
      "roomCode": "abc1234",
      "tripId": "trip_xyz",
      "memberCount": 2,
      "joinedAt": "2026-03-15T10:00:00.000Z"
    }
  ]
}
```

#### POST /api/pair

Create or join a pair room.

**Auth:** Authenticated

**Create Request:**
```json
{
  "action": "create",
  "tripId": "trip_abc"
}
```

**Join Request:**
```json
{
  "action": "join",
  "tripId": "trip_abc",
  "roomCode": "abc1234"
}
```

**Response:**
```json
{
  "roomCode": "abc1234",
  "memberCount": 2
}
```

---

### Crime Data

#### GET /api/crime

Get crime incident data for a city.

**Auth:** None (public, rate-limited)

**Query Parameters:**
- `city` (optional): City slug (default: `san-francisco`)
- `hours` (optional): Lookback window, 1-168 (default: 24)
- `limit` (optional): Max incidents, 200-10000 (default: 4000)
- `south`, `west`, `north`, `east` (optional): Viewport bounds

**Response:**
```json
{
  "incidents": [
    {
      "lat": 37.7749,
      "lng": -122.4194,
      "incidentDatetime": "2026-03-15T15:30:00",
      "incidentCategory": "Assault",
      "incidentSubcategory": "Aggravated Assault",
      "neighborhood": "Mission"
    }
  ],
  "hours": 72,
  "limit": 6000,
  "count": 1423,
  "source": {
    "provider": "SF Open Data",
    "datasetId": "wg3w-h783",
    "datasetUrl": "https://data.sfgov.org/d/wg3w-h783"
  },
  "bounds": {...},
  "generatedAt": "2026-03-16T12:00:00.000Z"
}
```

**Supported Cities:**
- `san-francisco` - SF Open Data
- `new-york` - NYC Open Data
- `los-angeles` - LA Open Data
- `chicago` - Chicago Data Portal

---

### Routing & Geocoding

#### POST /api/route

Compute a route between waypoints.

**Auth:** Authenticated  
**Rate Limit:** 40/min

**Request:**
```json
{
  "origin": { "lat": 37.7749, "lng": -122.4194 },
  "destination": { "lat": 37.7897, "lng": -122.3972 },
  "waypoints": [
    { "lat": 37.7855, "lng": -122.4089 }
  ],
  "travelMode": "WALKING"
}
```

**Response:**
```json
{
  "encodedPolyline": "a~l~Fjk~uOwHJy@...",
  "totalDistanceMeters": 2450,
  "totalDurationSeconds": 1830,
  "source": "live"
}
```

#### POST /api/geocode

Geocode an address to coordinates.

**Auth:** Authenticated  
**Rate Limit:** 25/min

**Request:**
```json
{
  "address": "Ferry Building, San Francisco"
}
```

**Response:**
```json
{
  "lat": 37.7955,
  "lng": -122.3937
}
```

---

### AI Features

#### POST /api/ai/parse

Parse travel content into structured events and spots using Claude AI.

**Auth:** Owner

**Request:**
```json
{
  "text": "Day 1: Visit Golden Gate Bridge at 10am, lunch at Ferry Building...",
  "cityId": "san-francisco",
  "cityName": "San Francisco"
}
```

**Response:**
```json
{
  "events": [
    {
      "id": "ai-abc123",
      "name": "Visit Golden Gate Bridge",
      "startDateISO": "2026-03-17",
      "startDateTimeText": "10:00 AM",
      "locationText": "Golden Gate Bridge"
    }
  ],
  "spots": [
    {
      "id": "ai-def456",
      "name": "Ferry Building",
      "tag": "eat",
      "location": "Ferry Building, SF"
    }
  ],
  "eventCount": 1,
  "spotCount": 1
}
```

---

## Error Responses

All endpoints return errors in a consistent format:

```json
{
  "error": "Error message here",
  "details": "Optional additional information"
}
```

### Common Error Codes

| Status | Meaning |
|--------|---------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Owner role required |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 502 | Bad Gateway - Upstream API failure |

---

## Caching

| Endpoint | Cache Strategy |
|----------|---------------|
| `GET /api/crime` | `s-maxage=60, stale-while-revalidate=120` |
| Route/geocode results | Server-side Convex cache (SHA256-keyed) |

---

## Further Reading

- [Architecture](./architecture.md) - System architecture overview
- [Sync Engine](./features/sync-engine.md) - Event ingestion details
- [Crime Heatmap](./features/crime-heatmap.md) - Crime data integration
- [Planner Time Grid](./features/planner-time-grid.md) - Planner state management
