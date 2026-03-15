import { requireAuthenticatedClient } from '@/lib/request-auth';
import { consumeRateLimit, getRequestRateLimitIp } from '@/lib/security';
import { ApiCache } from '@/lib/api-cache';

export const runtime = 'nodejs';

// Timezone for a location doesn't change — cache 24 hours
// Key is rounded lat/lng (2 decimal places ≈ 1km precision, good enough for timezone)
const tzCache = new ApiCache<{ timeZoneId: string; timeZoneName: string }>(500);
const TZ_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function roundCoord(val: string): string {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n.toFixed(2) : val;
}

export async function GET(request: Request) {
  const auth = await requireAuthenticatedClient();
  if (auth.deniedResponse || !auth.client) return auth.deniedResponse!;

  const rateLimit = consumeRateLimit({
    key: `api:timezone:${getRequestRateLimitIp(request)}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return Response.json(
      { error: 'Too many timezone requests. Please retry shortly.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    );
  }

  const url = new URL(request.url);
  const lat = url.searchParams.get('lat');
  const lng = url.searchParams.get('lng');
  if (!lat || !lng) {
    return Response.json({ error: 'lat and lng required' }, { status: 400 });
  }

  // Check cache (rounded coords — nearby points share timezone)
  const cacheKey = `${roundCoord(lat)},${roundCoord(lng)}`;
  const cached = tzCache.get(cacheKey);
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
    const timestamp = Math.floor(Date.now() / 1000);
    const tzRes = await fetch(
      `https://maps.googleapis.com/maps/api/timezone/json?location=${encodeURIComponent(lat)},${encodeURIComponent(lng)}&timestamp=${timestamp}&key=${apiKey}`
    );
    const tzData = await tzRes.json();
    if (tzData.status !== 'OK') {
      return Response.json({ error: tzData.errorMessage || tzData.status }, { status: 502 });
    }

    const result = { timeZoneId: tzData.timeZoneId, timeZoneName: tzData.timeZoneName };
    tzCache.set(cacheKey, result, TZ_CACHE_TTL_MS);

    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Timezone lookup failed' },
      { status: 500 }
    );
  }
}
