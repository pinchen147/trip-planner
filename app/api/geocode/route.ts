import { resolveAddressCoordinates } from '@/lib/events';
import { runWithAuthenticatedClient } from '@/lib/api-guards';
import { consumeRateLimit, getRequestRateLimitIp } from '@/lib/security';
import { ApiCache } from '@/lib/api-cache';

export const runtime = 'nodejs';

// Geocode results are stable — cache 24 hours
const geocodeCache = new ApiCache<{ lat: number; lng: number }>(500);
const GEOCODE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function POST(request) {
  return runWithAuthenticatedClient(async () => {
    const rateLimit = consumeRateLimit({
      key: `api:geocode:${getRequestRateLimitIp(request)}`,
      limit: 25,
      windowMs: 60_000
    });
    if (!rateLimit.ok) {
      return Response.json(
        { error: 'Too many geocode requests. Please retry shortly.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    let body = null;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid geocode request payload.' }, { status: 400 });
    }

    const address = String(body?.address || '').trim().slice(0, 300);
    if (!address) {
      return Response.json({ error: 'Address is required.' }, { status: 400 });
    }

    // Check cache
    const cacheKey = address.toLowerCase();
    const cached = geocodeCache.get(cacheKey);
    if (cached) {
      return Response.json(cached);
    }

    const coordinates = await resolveAddressCoordinates(address);
    if (!coordinates) {
      return Response.json({ error: 'Unable to geocode this address.' }, { status: 404 });
    }

    geocodeCache.set(cacheKey, coordinates, GEOCODE_CACHE_TTL_MS);

    return Response.json(coordinates);
  });
}
