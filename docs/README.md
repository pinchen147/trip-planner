# Trip Planner Documentation

> **Last Updated:** 2026-03-16

## Quick Links

- [Getting Started](./getting-started.md) - New contributor onboarding guide
- [Architecture](./architecture.md) - Full system architecture reference
- [API Reference](./api-reference.md) - REST API endpoint documentation
- [Design Guide](./design-guide.md) - UI/UX design system

---

## Documentation Index

### Core Architecture

| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | Comprehensive system architecture, tech stack, data flows, deployment |
| [Storage & Auth Model](./storage-auth-model.md) | Browser storage, Convex database, magic-link authentication |
| [Expansion Plan](./expansion-plan.md) | Multi-region platform expansion roadmap and blockers |

### Market Research

| Document | Description |
|----------|-------------|
| [Competitive Landscape](./competitive_landscape.md) | Analysis of travel planning apps (Wanderlog, TripIt, Mindtrip, etc.) |
| [Asian Apps Research](./competitive-research-asian-apps.md) | Research on Asian travel apps with AI import features |

### Design & UX

| Document | Description |
|----------|-------------|
| [Design Guide](./design-guide.md) | Dark mode design system, colors, typography, components |

---

## Feature Documentation

### Authentication & Security

| Feature | Description |
|---------|-------------|
| [Authentication Flow](./features/authentication-flow.md) | Magic-link sign-in, Resend integration, RBAC |
| [Security Layer](./features/security-layer.md) | Rate limiting, SSRF protection, CSP |
| [Cookie Consent](./features/cookie-consent.md) | GDPR cookie consent banner |

### Core Navigation

| Feature | Description |
|---------|-------------|
| [App Shell Navigation](./features/app-shell-navigation.md) | Header, tabs, layout, responsive breakpoints |
| [Landing Page](./features/landing-page.md) | Public landing page and marketing |
| [Trip Dashboard](./features/trip-dashboard.md) | Trip grid, create flow, trip management |
| [Trip Selector](./features/trip-selector.md) | Header dropdown for trip/city switching |
| [Status Bar](./features/status-bar.md) | Bottom status bar with sync info |

### Trip & City Management

| Feature | Description |
|---------|-------------|
| [Multi-City Trips](./features/multi-city-trips.md) | Multi-leg trips, city switching, per-leg data |
| [City Auto-Provisioning](./features/city-auto-provisioning.md) | Automatic city creation on trip creation |
| [City Picker Modal](./features/city-picker-modal.md) | Google Places-powered city search |
| [Trip Configuration](./features/trip-configuration.md) | Trip dates, base location, settings |
| [Trip Provider State](./features/trip-provider-state.md) | Central state management (TripProvider) |

### Map & Visualization

| Feature | Description |
|---------|-------------|
| [Map Integration](./features/map-integration.md) | Google Maps, markers, polylines, info windows |
| [Crime Heatmap](./features/crime-heatmap.md) | Real-time crime overlay, multi-city adapters |
| [Geocoding](./features/geocoding.md) | Address-to-coordinate resolution |

### Events & Sources

| Feature | Description |
|---------|-------------|
| [Sync Engine](./features/sync-engine.md) | iCal/RSS ingestion, Firecrawl extraction |
| [Event Source Management](./features/event-source-management.md) | CRUD for data sources |
| [AI Text Parsing](./features/ai-text-parsing.md) | Claude-powered itinerary generation from text |

### Planning

| Feature | Description |
|---------|-------------|
| [Planner Time Grid](./features/planner-time-grid.md) | 24-hour visual scheduler with drag-and-drop |
| [Pair Planner](./features/pair-planner.md) | 2-person collaborative planning rooms |
| [Calendar View](./features/calendar-view.md) | Month grid with event counts |
| [Calendar Export](./features/calendar-export.md) | ICS file and Google Calendar export |
| [Day List Sidebar](./features/day-list-sidebar.md) | Vertical date selector |
| [Events Itinerary](./features/events-itinerary.md) | Event cards for selected date |
| [Spots Itinerary](./features/spots-itinerary.md) | Curated spot cards by tag |

### Data & Schema

| Feature | Description |
|---------|-------------|
| [Database Schema](./features/database-schema.md) | Convex table definitions and indexes |
| [Date-Time Helpers](./features/date-time-helpers.md) | Timezone-aware formatting utilities |
| [Spots Auto-Discovery](./features/spots-auto-discovery.md) | Automatic spot detection |

### Infrastructure

| Feature | Description |
|---------|-------------|
| [SEO Metadata](./features/seo-metadata.md) | OpenGraph, Twitter cards, structured data |
| [UI Primitives](./features/ui-primitives.md) | Radix-based component library |

---

## Production Deployment Checklist

> **CRITICAL**: Before deploying to production, ensure these items are addressed:

- [ ] Set `DEV_BYPASS_AUTH = false` in all three files:
  - `middleware.ts:18`
  - `convex/authz.ts:5`
  - `lib/request-auth.ts:5`
- [ ] Configure `OWNER_EMAIL_ALLOWLIST` with actual owner emails
- [ ] Set `AUTH_EMAIL_FROM` to a verified sender domain
- [ ] Implement cookie consent enforcement (currently cosmetic only)
- [ ] Review and enable TypeScript strict mode
- [ ] Remove `@ts-nocheck` from `lib/events.ts`

---

## Key Constants Reference

| Constant | Value | Location |
|----------|-------|----------|
| `CRIME_REFRESH_INTERVAL_MS` | 120,000 (2 min) | `TripProvider.tsx:53` |
| `CRIME_HEATMAP_HOURS` | 72 | `TripProvider.tsx:51` |
| `PLAN_SNAP_MINUTES` | 15 | `planner-helpers.ts:13` |
| `PLAN_HOUR_HEIGHT` | 50px | `planner-helpers.ts:14` |
| `MIN_PLAN_BLOCK_MINUTES` | 30 | `helpers.ts:2` |
| `MAX_ROUTE_STOPS` | 8 | `planner-helpers.ts:18` |
| `MISSED_SYNC_THRESHOLD` | 2 | `events.ts:19` |
| Planner save debounce | 450ms | `TripProvider.tsx:524` |
| Route draw delay | 320ms | `TripProvider.tsx:1431` |

---

## Contributing

1. Read the [Getting Started](./getting-started.md) guide
2. Review the [Architecture](./architecture.md) document
3. Follow the [Design Guide](./design-guide.md) for UI work
4. Run `bun lint` before submitting PRs
