# Getting Started

> **Last Updated:** 2026-03-16

This guide helps new contributors get up and running with the Trip Planner codebase.

---

## Prerequisites

- **Node.js** 24.x or later
- **Bun** 1.2.x or later (package manager)
- **Git** 2.x
- A code editor (VS Code recommended)

### Required Accounts / API Keys

| Service | Purpose | Required for |
|---------|---------|--------------|
| [Convex](https://convex.dev) | Database + backend | All features |
| [Google Cloud](https://console.cloud.google.com) | Maps, Geocoding, Routes | Map features |
| [Resend](https://resend.com) | Magic link emails | Authentication |
| [Firecrawl](https://firecrawl.dev) | Web scraping | RSS/event extraction (optional) |

---

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd trip-planner
bun install
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Required variables for local development:

```env
# Convex
CONVEX_URL=<your-convex-deployment-url>
NEXT_PUBLIC_CONVEX_URL=<your-convex-deployment-url>

# Google Maps (get from Google Cloud Console)
GOOGLE_MAPS_BROWSER_KEY=<your-browser-key>
GOOGLE_MAPS_ROUTES_KEY=<your-routes-key>
GOOGLE_MAPS_GEOCODING_KEY=<your-geocoding-key>

# Auth (get from Resend dashboard)
AUTH_RESEND_KEY=<your-resend-api-key>
OWNER_EMAIL_ALLOWLIST=your@email.com

# Optional
FIRECRAWL_API_KEY=<for-rss-extraction>
ENABLE_FIRECRAWL=false
```

### 3. Initialize Convex

```bash
# Login to Convex
npx convex login

# Initialize/connect to your deployment
bun convex:dev

# In another terminal, seed initial city data
npx convex run seed:seedInitialDataInternal
```

### 4. Start Development Server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
trip-planner/
├── app/                    # Next.js App Router
│   ├── api/               # REST API endpoints (14 routes)
│   ├── dashboard/         # Trip dashboard page
│   ├── signin/            # Auth pages
│   └── trips/[tripId]/    # Protected trip views
├── components/            # React components
│   ├── providers/         # Context providers (TripProvider)
│   └── ui/               # Radix-based primitives
├── convex/               # Convex backend (schema, mutations, queries)
├── data/                 # Static JSON data + caches
├── docs/                 # Documentation (you are here)
├── lib/                  # Shared utilities
└── public/              # Static assets
```

---

## Key Concepts

### TripProvider

The `TripProvider` (`components/providers/TripProvider.tsx`) is the central state manager. It wraps all protected routes and provides:

- Trip and city selection state
- Events, spots, and planner data
- Map initialization and marker management
- Crime heatmap fetching and rendering
- All handler functions for user actions

Access it via the `useTrip()` hook:

```tsx
import { useTrip } from '@/components/providers/TripProvider';

function MyComponent() {
  const { selectedDate, dayPlanItems, addEventToDayPlan } = useTrip();
  // ...
}
```

### Authentication

- Magic-link authentication via Resend
- Two roles: `owner` (full access) and `member` (view/plan only)
- Role determined by `OWNER_EMAIL_ALLOWLIST` env var
- **DEV_BYPASS_AUTH** is currently enabled - see [Production Checklist](#production-checklist)

### Multi-City Architecture

- Trips have multiple "legs" (city + date range)
- Events, spots, and sources are scoped by `cityId`
- Planner entries are scoped by `tripId + roomCode`
- City data is auto-provisioned when creating trips

---

## Common Tasks

### Adding a New Feature

1. Read the [Architecture](./architecture.md) doc
2. Check if a [Feature Doc](./features/) exists for related functionality
3. Follow the [Design Guide](./design-guide.md) for UI work
4. Run `bun lint` before committing

### Running Tests

```bash
# All backend tests
bun run test:backend

# Specific test file
node --test lib/crime-cities.test.mjs

# Lint check
bun lint
```

### Adding a New City

1. Add entry to `lib/city-registry.ts`:

```typescript
'your-city': {
  slug: 'your-city',
  name: 'Your City',
  timezone: 'America/New_York',
  locale: 'en-US',
  mapCenter: { lat: 40.7128, lng: -74.006 },
  mapBounds: { north: 40.9, south: 40.5, east: -73.7, west: -74.3 },
  crimeAdapterId: '', // Add if crime data available
},
```

2. Optionally add to seed data in `convex/seed.ts`

3. If crime data is available, add config to `lib/crime-cities.ts`

### Adding a New API Endpoint

1. Create route file: `app/api/your-endpoint/route.ts`
2. Use auth guards from `lib/api-guards.ts`:

```typescript
import { runWithAuthenticatedClient } from '@/lib/api-guards';

export async function GET(request: Request) {
  return runWithAuthenticatedClient(async ({ client, profile }) => {
    // Your logic here
    return Response.json({ data: 'example' });
  });
}
```

3. Document in `docs/api-reference.md`

---

## Production Checklist

Before deploying to production:

- [ ] Set `DEV_BYPASS_AUTH = false` in:
  - `middleware.ts:18`
  - `convex/authz.ts:5`
  - `lib/request-auth.ts:5`
- [ ] Configure `OWNER_EMAIL_ALLOWLIST` with real owner emails
- [ ] Set `AUTH_EMAIL_FROM` to a verified sender domain
- [ ] Deploy Convex functions: `npx convex deploy`
- [ ] Implement cookie consent enforcement (currently cosmetic)
- [ ] Remove `@ts-nocheck` from `lib/events.ts`

---

## Troubleshooting

### "Missing GOOGLE_MAPS_BROWSER_KEY"

The map won't load without a valid Google Maps API key. Get one from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).

### Convex Connection Errors

```bash
# Re-authenticate
npx convex logout
npx convex login

# Check deployment status
npx convex dashboard
```

### Auth Not Working

Check that:
1. `DEV_BYPASS_AUTH = true` in all three files (for local dev)
2. `AUTH_RESEND_KEY` is set correctly
3. Your email is in `OWNER_EMAIL_ALLOWLIST` for owner access

### Events Not Loading

1. Check that city data is seeded: `npx convex run seed:seedInitialDataInternal`
2. Verify sync sources exist for your city
3. Check browser console for API errors

---

## Further Reading

- [Architecture](./architecture.md) - Full system architecture
- [API Reference](./api-reference.md) - REST API documentation
- [Design Guide](./design-guide.md) - UI/UX patterns
- [Feature Docs](./features/) - Per-feature documentation
- [Expansion Plan](./expansion-plan.md) - Roadmap and blockers

---

## Getting Help

- Check existing [Feature Docs](./features/) for implementation details
- Review the [Architecture](./architecture.md) for system overview
- Look at similar patterns in existing code
