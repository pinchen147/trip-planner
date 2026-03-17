import { generateItineraryFromText, AiParseError } from '@/lib/ai-parse';
import { runWithOwnerClient } from '@/lib/api-guards';
import { getScopedConvexClient } from '@/lib/convex-client-context';
import { consumeRateLimit, getRequestRateLimitIp } from '@/lib/security';

export const runtime = 'nodejs';

const MAX_TEXT_LENGTH = 50_000;

export async function POST(request: Request) {
  const rateLimit = consumeRateLimit({
    key: `api:ai-parse:${getRequestRateLimitIp(request)}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return Response.json(
      { error: 'Too many AI generation requests. Please retry shortly.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    );
  }

  return runWithOwnerClient(async () => {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const text = String(body?.text || '').trim();
    const cityId = String(body?.cityId || '').trim();

    if (!text) {
      return Response.json({ error: 'Text is required.' }, { status: 400 });
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return Response.json(
        { error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters.` },
        { status: 400 },
      );
    }
    if (!cityId) {
      return Response.json({ error: 'cityId is required.' }, { status: 400 });
    }

    const cityName = String(body?.cityName || cityId);

    try {
      const result = await generateItineraryFromText(text, cityName);

      const client = getScopedConvexClient();
      const warnings: string[] = [];

      if (client && result.events.length > 0) {
        try {
          await client.mutation('events:upsertEvents', {
            cityId,
            events: result.events.map((e) => ({
              id: e.id,
              name: e.name,
              description: e.description,
              startDateISO: e.startDateISO,
              startDateTimeText: e.startDateTimeText,
              locationText: e.locationText,
              address: e.address,
              eventUrl: e.eventUrl,
              googleMapsUrl: '',
              sourceId: 'ai-parse',
              sourceUrl: 'ai-parsed://text-input',
              confidence: 0.8,
            })),
            syncedAt: new Date().toISOString(),
            calendars: [],
            // Use a very high threshold so normal calendar syncs (which won't
            // include AI-parsed events) never increment these past the limit.
            missedSyncThreshold: 999,
          });
        } catch (err) {
          console.error('Failed to save AI-parsed events to Convex:', err);
          warnings.push('Events were parsed but could not be saved.');
        }
      }

      if (client && result.spots.length > 0) {
        try {
          await client.mutation('spots:upsertSpots', {
            cityId,
            spots: result.spots.map((s) => ({
              id: s.id,
              name: s.name,
              tag: s.tag,
              location: s.location,
              mapLink: '',
              cornerLink: '',
              description: s.description,
              details: s.details,
              curatorComment: s.curatorComment,
              sourceId: 'ai-parse',
              sourceUrl: 'ai-parsed://text-input',
              confidence: 0.8,
            })),
            syncedAt: new Date().toISOString(),
            sourceUrls: ['ai-parsed://text-input'],
            // Use a very high threshold so normal calendar syncs (which won't
            // include AI-parsed spots) never increment these past the limit.
            missedSyncThreshold: 999,
          });
        } catch (err) {
          console.error('Failed to save AI-parsed spots to Convex:', err);
          warnings.push('Spots were parsed but could not be saved.');
        }
      }

      return Response.json({
        eventCount: result.events.length,
        spotCount: result.spots.length,
        ...(warnings.length > 0 ? { warning: warnings.join(' ') } : {}),
      });
    } catch (err) {
      const isAiError = err instanceof AiParseError;
      const status = isAiError && err.message.includes('not configured') ? 503 : isAiError ? 422 : 500;
      if (!isAiError) console.error('AI parse failed:', err);
      return Response.json(
        { error: isAiError ? err.message : 'AI parsing failed.' },
        { status },
      );
    }
  });
}
