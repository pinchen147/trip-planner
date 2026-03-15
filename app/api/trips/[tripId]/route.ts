import { requireAuthenticatedClient } from '@/lib/request-auth';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const auth = await requireAuthenticatedClient();
  if (auth.deniedResponse || !auth.client) {
    return auth.deniedResponse;
  }

  const { tripId } = await params;
  try {
    const trip = await auth.client.query('trips:getTrip', { tripId });
    if (!trip) {
      return Response.json({ error: 'Trip not found.' }, { status: 404 });
    }
    return Response.json({ trip });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to get trip.' },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const auth = await requireAuthenticatedClient();
  if (auth.deniedResponse || !auth.client) {
    return auth.deniedResponse;
  }

  const { tripId } = await params;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  try {
    const trip = await auth.client.mutation('trips:updateTrip', {
      tripId,
      name: body.name,
      legs: body.legs,
    });
    if (!trip) {
      return Response.json({ error: 'Trip not found.' }, { status: 404 });
    }
    return Response.json({ trip });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to update trip.' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const auth = await requireAuthenticatedClient();
  if (auth.deniedResponse || !auth.client) {
    return auth.deniedResponse;
  }

  const { tripId } = await params;
  try {
    const result = await auth.client.mutation('trips:deleteTrip', { tripId });
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to delete trip.' },
      { status: 400 }
    );
  }
}
