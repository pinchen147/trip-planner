import { discoverSpotsIfNeeded } from '@/lib/events';
import { runWithAuthenticatedClient } from '@/lib/api-guards';
import { consumeRateLimit, getRequestRateLimitIp } from '@/lib/security';

export const runtime = 'nodejs';

// Concurrency guard: one discovery per city at a time
const inFlightByCity = new Map<string, Promise<any>>();

export async function POST(request: Request) {
  return runWithAuthenticatedClient(async () => {
    const rateLimit = consumeRateLimit({
      key: `api:spots-discover:${getRequestRateLimitIp(request)}`,
      limit: 5,
      windowMs: 60_000,
    });
    if (!rateLimit.ok) {
      return Response.json(
        { error: 'Too many discovery requests. Please retry shortly.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const cityId = String(body?.cityId || '').trim();
    if (!cityId) {
      return Response.json({ error: 'cityId is required.' }, { status: 400 });
    }

    const force = body?.force === true;

    // Dedup concurrent requests for the same city
    let pending = inFlightByCity.get(cityId);
    if (!pending || force) {
      pending = discoverSpotsIfNeeded(cityId, { force }).finally(() => {
        inFlightByCity.delete(cityId);
      });
      inFlightByCity.set(cityId, pending);
    }

    try {
      const result = await pending;
      return Response.json(result);
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : 'Spot discovery failed.' },
        { status: 500 }
      );
    }
  });
}
