import { requireAuthenticatedClient } from '@/lib/request-auth';
import { consumeRateLimit, getRequestRateLimitIp } from '@/lib/security';
import { ApiCache } from '@/lib/api-cache';

export const runtime = 'nodejs';

// Cache city details: lat/lng/bounds/timezone don't change — 24 hour TTL
const detailsCache = new ApiCache<any>(500);
const DETAILS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const auth = await requireAuthenticatedClient();
  if (auth.deniedResponse || !auth.client) return auth.deniedResponse!;

  const rateLimit = consumeRateLimit({
    key: `api:city-details:${getRequestRateLimitIp(request)}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return Response.json(
      { error: 'Too many detail requests. Please retry shortly.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    );
  }

  const url = new URL(request.url);
  const placeId = url.searchParams.get('placeId') || '';
  if (!placeId) {
    return Response.json({ error: 'placeId is required' }, { status: 400 });
  }

  // Check cache first
  const cached = detailsCache.get(placeId);
  if (cached) {
    return Response.json(cached);
  }

  const apiKey =
    process.env.GOOGLE_MAPS_GEOCODING_KEY ||
    process.env.GOOGLE_MAPS_SERVER_KEY ||
    process.env.GOOGLE_MAPS_BROWSER_KEY ||
    '';
  if (!apiKey) {
    return Response.json({ error: 'No Google Maps API key configured' }, { status: 500 });
  }

  try {
    const fields = 'location,viewport,addressComponents,displayName';
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=${fields}`,
      {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': fields,
        },
      }
    );

    const data = await res.json();
    if (!res.ok) {
      return Response.json(
        { error: data.error?.message || 'Place details failed' },
        { status: 502 }
      );
    }

    const location = data.location || {};
    const viewport = data.viewport || {};
    const lat = location.latitude ?? 0;
    const lng = location.longitude ?? 0;

    const countryComponent = (data.addressComponents || []).find(
      (c: any) => c.types?.includes('country')
    );
    const countryCode = countryComponent?.shortText || '';
    const countryName = countryComponent?.longText || '';

    // Resolve timezone
    let timezone = 'UTC';
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const tzRes = await fetch(
        `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${timestamp}&key=${apiKey}`
      );
      const tzData = await tzRes.json();
      if (tzData.status === 'OK' && tzData.timeZoneId) {
        timezone = tzData.timeZoneId;
      }
    } catch {
      // Fall back to UTC
    }

    const ne = viewport.high || {};
    const sw = viewport.low || {};

    const result = {
      displayName: data.displayName?.text || '',
      lat,
      lng,
      countryCode,
      countryName,
      timezone,
      mapBounds: {
        north: ne.latitude ?? lat + 0.1,
        south: sw.latitude ?? lat - 0.1,
        east: ne.longitude ?? lng + 0.1,
        west: sw.longitude ?? lng - 0.1,
      },
    };

    detailsCache.set(placeId, result, DETAILS_CACHE_TTL_MS);

    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Place details failed' },
      { status: 500 }
    );
  }
}
