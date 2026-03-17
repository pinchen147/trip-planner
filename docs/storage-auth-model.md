# Storage and Auth Model (Current)

> **Last Updated:** 2026-03-15

This document describes how the app currently uses browser storage, Convex real-time database, and magic-link authentication to gate access.

## 1) Storage Layers

### Browser localStorage (per browser profile)

- Active trip ID: `tripPlanner:activeTripId`
- Cookie consent: `cookie-consent` (`accepted` | `declined`)

Behavior:
- The active trip ID is written when a user selects a trip from the dashboard or TripSelector.
- TripProvider reads this on mount; URL params (`/trips/{urlId}/...`) take priority.
- Cookie consent is read/written by the CookieConsent component; accepted/declined values persist across sessions.

### Convex (remote DB, primary data store)

Tables used:
- `cities` -- city definitions with map bounds, timezone, locale, crime adapter
- `trips` -- user trips with multi-leg array
- `tripConfig` -- per-trip timezone, date range, base location
- `events`, `spots`, `sources`, `syncMeta` -- city-scoped content
- `plannerEntries` -- planner items scoped to trip + room
- `pairRooms`, `pairMembers` -- pair planning rooms scoped to trip
- `userProfiles` -- role-based access (owner/member)
- `geocodeCache`, `routeCache` -- cached API responses
- `plannerState` -- legacy planner table (kept for reference)

Behavior:
- All data is stored in Convex. There are no local server files or JSON caches.
- API routes create a `ConvexHttpClient` with the user's auth token to proxy requests.
- Events, spots, and sources are scoped by `cityId`.
- Planner entries, pair rooms, and members are scoped by `tripId`.
- Trip config is scoped by `tripId` (one config per trip).

## 2) Planner: Trip-Scoped Pair Rooms

### Solo mode

- Planner data is stored in Convex `plannerEntries` table, keyed by `tripId` + `roomCode` + `ownerUserId`.
- No pair room is required; the system uses a default room code.

### Shared mode (2-person pair planning)

- Requires:
  - Authenticated user (magic link session),
  - Valid room code (2-64 chars, `a-z`, `0-9`, `_`, `-`),
  - Convex connectivity.
- Planner entries are scoped to `tripId + roomCode`.
- Each user's entries are further scoped by `ownerUserId`.
- Reads/writes go through `GET/POST /api/planner` with `roomId` parameter.

## 3) Authentication

### Magic Link (Resend)

Auth is handled by `@convex-dev/auth` with Resend as the email provider:

- Provider: `Email` with Resend API (`convex/auth.ts`)
- Link expiry: 1 hour
- Email template: branded HTML with "TRIP PLANNER" branding and `#00FF88` accent
- From address: configurable via `AUTH_EMAIL_FROM` env var (defaults to `Trip Planner <onboarding@resend.dev>`)

### Session Management

- Session is managed by Convex Auth (JWT-based, not cookie-based admin password).
- The `convexAuthNextjsToken()` function extracts the token from the request.
- API routes use `requireAuthenticatedClient()` or `requireOwnerClient()` from `lib/request-auth.ts`.

### Dev Bypass

> **⚠️ CRITICAL PRODUCTION WARNING ⚠️**
>
> The `DEV_BYPASS_AUTH = true` flag is currently **ENABLED** in three files. This completely disables authentication and must be set to `false` before any production deployment:
>
> | File | Line | Current Value |
> |------|------|---------------|
> | `middleware.ts` | 18 | `true` |
> | `convex/authz.ts` | 5 | `true` |
> | `lib/request-auth.ts` | 5 | `true` |
>
> **All three files must be updated together.** Partial updates will cause inconsistent auth behavior.

A temporary `DEV_BYPASS_AUTH = true` flag exists in three files:
- `convex/authz.ts` -- bypasses userId extraction
- `lib/request-auth.ts` -- bypasses token verification
- `middleware.ts` -- skips auth redirects

When enabled, all requests are treated as authenticated with a hardcoded `dev-bypass` userId.

**Production Deployment Checklist:**
- [ ] Set `DEV_BYPASS_AUTH = false` in `middleware.ts:18`
- [ ] Set `DEV_BYPASS_AUTH = false` in `convex/authz.ts:5`
- [ ] Set `DEV_BYPASS_AUTH = false` in `lib/request-auth.ts:5`
- [ ] Deploy Convex functions (`npx convex deploy`)
- [ ] Verify auth redirects work on `/dashboard` when logged out

### Authorization Guards

Two guard levels in `convex/authz.ts`:
- `requireAuthenticatedUserId(ctx)` -- any logged-in user
- `requireOwnerUserId(ctx)` -- must have `role: 'owner'` in `userProfiles` table

## 4) Route Protection

### Middleware (`middleware.ts`)

Protected routes:
- `/dashboard(.*)` -- trip dashboard
- `/trips(.*)` -- all trip planning views

Redirect logic:
- Unauthenticated users hitting protected routes -> `/signin`
- Authenticated users hitting `/signin` -> `/dashboard`
- Legacy tab routes (`/map`, `/planning`, etc.) -> `/dashboard` or `/trips/{tripId}/{tab}` via query param

### API Route Auth

| Route | Auth Level | Guard Function |
|-------|-----------|----------------|
| `GET /api/cities` | Authenticated | `requireAuthenticatedClient` |
| `POST /api/cities` | Owner | `requireOwnerClient` |
| `GET /api/trips` | Authenticated | `requireAuthenticatedClient` |
| `POST /api/trips` | Authenticated | `requireAuthenticatedClient` |
| `GET /api/events` | Authenticated | `requireAuthenticatedClient` |
| `POST /api/sync` | Owner | `requireOwnerClient` |
| `GET /api/config` | Authenticated | `requireAuthenticatedClient` |
| `POST /api/config` | Owner | `requireOwnerClient` |
| `GET/POST /api/sources` | Owner | `requireOwnerClient` |
| `GET/POST /api/pair` | Authenticated | `requireAuthenticatedClient` |
| `GET/POST /api/planner` | Authenticated | `requireAuthenticatedClient` |
| `GET /api/crime` | Authenticated | `requireAuthenticatedClient` |

## 5) Environment Variables (Auth-Related)

| Variable | Purpose |
|----------|---------|
| `CONVEX_URL` / `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL |
| `AUTH_RESEND_KEY` | Resend API key for magic link emails |
| `AUTH_EMAIL_FROM` | From address for auth emails |
| `AUTH_RESEND_TEMPLATE_ID` | Optional Resend template ID |
| `NEXT_PUBLIC_CONVEX_URL` | Client-side Convex URL |
