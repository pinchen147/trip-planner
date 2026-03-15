import { syncEvents } from '@/lib/events';
import { runWithOwnerClient } from '@/lib/api-guards';

export const runtime = 'nodejs';

let syncInFlight = null;

export async function POST(request) {
  return runWithOwnerClient(async () => {
    try {
      let cityId = '';
      try {
        const body = await request.json();
        cityId = typeof body.cityId === 'string' ? body.cityId.trim() : '';
      } catch {
        // no body is OK, cityId stays empty
      }

      if (!syncInFlight) {
        syncInFlight = syncEvents(cityId).finally(() => {
          syncInFlight = null;
        });
      }

      const payload = await syncInFlight;
      return Response.json(payload);
    } catch (error) {
      return Response.json(
        {
          error: error instanceof Error ? error.message : 'Unexpected error'
        },
        { status: 500 }
      );
    }
  });
}
