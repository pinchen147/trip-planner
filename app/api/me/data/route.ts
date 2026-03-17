import { requireAuthenticatedClient } from '@/lib/request-auth';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireAuthenticatedClient();
  if (auth.deniedResponse || !auth.client) {
    return auth.deniedResponse;
  }

  const userId = auth.profile?.userId;
  if (!userId) {
    return Response.json({ error: 'User ID not found.' }, { status: 400 });
  }

  try {
    const [trips, profile] = await Promise.all([
      auth.client.query('trips:listMyTrips', {}),
      Promise.resolve(auth.profile),
    ]);

    const tripList = Array.isArray(trips) ? trips : [];

    // Collect planner state, pair rooms, and trip config per trip
    const plannerStates: any[] = [];
    const pairRooms: any[] = [];
    const tripConfigs: any[] = [];
    for (const trip of tripList) {
      try {
        const state = await auth.client.query('planner:getPlannerState' as any, { tripId: trip._id });
        if (state?.plannerByDateMine) {
          plannerStates.push({
            tripId: trip._id,
            tripName: trip.name,
            plannerByDate: state.plannerByDateMine,
          });
        }
      } catch {
        // Trip may not have planner entries
      }
      try {
        const rooms = await auth.client.query('planner:listMyPairRooms' as any, { tripId: trip._id });
        if (Array.isArray(rooms) && rooms.length > 0) {
          pairRooms.push(...rooms);
        }
      } catch {
        // Trip may not have pair rooms
      }
      try {
        const config = await auth.client.query('tripConfig:getTripConfig' as any, { tripId: trip._id });
        if (config) tripConfigs.push({ tripId: trip._id, ...config });
      } catch {
        // Trip may not have config
      }
    }

    // Collect sources for all cities in user's trips
    const cityIds = [...new Set(tripList.flatMap((t: any) =>
      Array.isArray(t.legs) ? t.legs.map((l: any) => l.cityId).filter(Boolean) : []
    ))];
    const sources: any[] = [];
    for (const cityId of cityIds) {
      try {
        const citySources = await auth.client.query('sources:listSources' as any, { cityId });
        if (Array.isArray(citySources)) sources.push(...citySources);
      } catch {
        // City may not have sources
      }
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: {
        email: profile?.email || null,
        role: profile?.role || null,
        userId,
      },
      trips: tripList,
      tripConfigs,
      plannerStates,
      pairRooms,
      sources,
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="trip-planner-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to export data.' },
      { status: 500 }
    );
  }
}
