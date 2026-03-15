import { requireAuthenticatedClient, requireOwnerClient } from '@/lib/request-auth';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireAuthenticatedClient();
  if (auth.deniedResponse || !auth.client) {
    return auth.deniedResponse;
  }

  try {
    const cities = await auth.client.query('cities:listCities', {});
    return Response.json({ cities: Array.isArray(cities) ? cities : [] });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to list cities.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireOwnerClient();
  if (auth.deniedResponse || !auth.client) {
    return auth.deniedResponse;
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  try {
    const city = await auth.client.mutation('cities:createCity', {
      slug: String(body.slug || '').trim(),
      name: String(body.name || '').trim(),
      timezone: String(body.timezone || 'UTC').trim(),
      locale: String(body.locale || 'en-US').trim(),
      mapCenter: body.mapCenter,
      mapBounds: body.mapBounds,
      crimeAdapterId: body.crimeAdapterId || '',
    });
    return Response.json({ city });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to create city.' },
      { status: 400 }
    );
  }
}
