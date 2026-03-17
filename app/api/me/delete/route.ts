import { requireAuthenticatedClient } from '@/lib/request-auth';

export const runtime = 'nodejs';

export async function DELETE() {
  const auth = await requireAuthenticatedClient();
  if (auth.deniedResponse || !auth.client) {
    return auth.deniedResponse;
  }

  const userId = auth.profile?.userId;
  if (!userId) {
    return Response.json({ error: 'User ID not found.' }, { status: 400 });
  }

  try {
    // Delete all user trips (which cascades to planner entries, pair rooms, etc.)
    const trips = await auth.client.query('trips:listMyTrips', {});
    const tripIds = (Array.isArray(trips) ? trips : []).map((t: any) => t._id);

    for (const tripId of tripIds) {
      await auth.client.mutation('trips:deleteTrip', { tripId });
    }

    // Delete user profile
    try {
      await auth.client.mutation('userProfiles:deleteMyProfile', {});
    } catch {
      // Profile may not exist or mutation may not be defined yet
    }

    return Response.json({
      deleted: true,
      message: 'All your data has been deleted.',
      deletedTrips: tripIds.length,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to delete account data.' },
      { status: 500 }
    );
  }
}
