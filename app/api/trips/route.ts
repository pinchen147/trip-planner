import { requireAuthenticatedClient } from '@/lib/request-auth';
import { getCrimeAdapterIdForSlug } from '@/lib/city-registry';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireAuthenticatedClient();
  if (auth.deniedResponse || !auth.client) {
    return auth.deniedResponse;
  }

  try {
    let trips = await auth.client.query('trips:listMyTrips', {});
    trips = Array.isArray(trips) ? trips : [];
    // Backfill urlId for legacy trips missing it (one-time migration)
    if (trips.some((t: any) => !t.urlId)) {
      await auth.client.mutation('trips:backfillUrlIds', {}).catch(() => {});
      trips = await auth.client.query('trips:listMyTrips', {});
      trips = Array.isArray(trips) ? trips : [];
    }
    return Response.json({ trips });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to list trips.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedClient();
  if (auth.deniedResponse || !auth.client) {
    return auth.deniedResponse;
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const legs: any[] = Array.isArray(body.legs) ? body.legs : [];
  const cityMeta: Record<string, any> = body.cityMeta || {};

  try {
    // Auto-ensure all leg cities exist using inline metadata from the client
    const uniqueSlugs = [...new Set(legs.map((l: any) => l.cityId).filter(Boolean))];
    await Promise.all(
      uniqueSlugs.map((slug) => {
        const meta = cityMeta[slug];
        if (!meta) return; // No metadata provided — city should already exist in DB
        return auth.client.mutation('cities:ensureCity', {
          slug,
          name: String(meta.name || slug),
          timezone: String(meta.timezone || 'UTC'),
          locale: String(meta.locale || 'en-US'),
          mapCenter: meta.mapCenter,
          mapBounds: meta.mapBounds,
          crimeAdapterId: getCrimeAdapterIdForSlug(slug),
        });
      })
    );

    const trip = await auth.client.mutation('trips:createTrip', {
      name: String(body.name || '').trim(),
      legs,
    });
    return Response.json({ trip });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to create trip.' },
      { status: 400 }
    );
  }
}
