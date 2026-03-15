import { loadBaseLocation, saveBaseLocation, getCalendarUrls, loadTripConfig, saveTripConfig } from '@/lib/events';
import { runWithAuthenticatedClient, runWithOwnerClient } from '@/lib/api-guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  return runWithAuthenticatedClient(async () => {
    const url = new URL(request.url);
    const tripId = url.searchParams.get('tripId') || '';

    const [baseLocation, tripConfig] = await Promise.all([
      loadBaseLocation(tripId),
      loadTripConfig(tripId)
    ]);

    return Response.json({
      mapsBrowserKey: process.env.GOOGLE_MAPS_BROWSER_KEY || '',
      mapsMapId: process.env.GOOGLE_MAPS_MAP_ID || '',
      baseLocation,
      calendars: getCalendarUrls(),
      tripStart: tripConfig.tripStart || process.env.TRIP_START || '',
      tripEnd: tripConfig.tripEnd || process.env.TRIP_END || '',
      timezone: tripConfig.timezone || 'UTC'
    });
  });
}

export async function POST(request) {
  return runWithOwnerClient(async () => {
    try {
      const body = await request.json();
      const tripId = typeof body.tripId === 'string' ? body.tripId.trim() : '';
      const timezone = typeof body.timezone === 'string' ? body.timezone.trim() : undefined;
      const tripStart = typeof body.tripStart === 'string' ? body.tripStart.trim() : '';
      const tripEnd = typeof body.tripEnd === 'string' ? body.tripEnd.trim() : '';

      if (!tripId) {
        return Response.json({ error: 'tripId is required.' }, { status: 400 });
      }

      await saveTripConfig({ tripId, timezone, tripStart, tripEnd });
      if (typeof body.baseLocation === 'string') {
        await saveBaseLocation(body.baseLocation, tripId);
      }
      return Response.json({ ok: true, tripStart, tripEnd });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 400 });
    }
  });
}
