import { requireAuthenticatedClient } from '@/lib/request-auth';
import { getPlannerRoomCodeFromUrl, getPlannerTripIdFromUrl, parsePlannerPostPayload } from '@/lib/planner-api';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const auth = await requireAuthenticatedClient();
  if (auth.deniedResponse || !auth.client) {
    return auth.deniedResponse;
  }

  const roomCode = getPlannerRoomCodeFromUrl(request.url);
  const tripId = getPlannerTripIdFromUrl(request.url);

  if (!tripId) {
    return Response.json({ error: 'tripId query parameter is required.' }, { status: 400 });
  }

  try {
    const payload = await auth.client.query('planner:getPlannerState', {
      tripId,
      roomCode: roomCode || undefined
    });
    return Response.json(payload);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Failed to load planner state.'
      },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedClient();
  if (auth.deniedResponse || !auth.client) {
    return auth.deniedResponse;
  }

  const queryRoomCode = getPlannerRoomCodeFromUrl(request.url);
  let body: unknown = null;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        error: 'Invalid planner payload.'
      },
      { status: 400 }
    );
  }

  const plannerPayload = parsePlannerPostPayload(body, queryRoomCode);
  if (!plannerPayload.ok) {
    return Response.json(
      {
        error: plannerPayload.error
      },
      { status: 400 }
    );
  }

  if (!plannerPayload.tripId) {
    return Response.json({ error: 'tripId is required.' }, { status: 400 });
  }

  if (!plannerPayload.cityId) {
    return Response.json({ error: 'cityId is required.' }, { status: 400 });
  }

  try {
    const payload = await auth.client.mutation('planner:replacePlannerState', {
      tripId: plannerPayload.tripId,
      cityId: plannerPayload.cityId,
      roomCode: plannerPayload.roomCode || undefined,
      plannerByDate: plannerPayload.plannerByDate
    });
    return Response.json(payload);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Failed to save planner state.'
      },
      { status: 400 }
    );
  }
}
