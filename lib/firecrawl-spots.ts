/**
 * Firecrawl extraction module for spot discovery.
 *
 * Calls Firecrawl /v1/extract with a generic prompt that works across
 * any curated list site (Corner.inc, Eater, Infatuation, Time Out, etc.).
 * Handles the async polling pattern: submit job → poll until completed.
 */

const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev';
const DEFAULT_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 1_500;

export interface RawExtractedPlace {
  name?: string;
  tag?: string;
  location?: string;
  mapLink?: string;
  cornerLink?: string;
  curatorComment?: string;
  shortDescription?: string;
  details?: string;
}

export const SPOTS_EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    places: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          tag: { type: 'string' },
          location: { type: 'string' },
          mapLink: { type: 'string' },
          cornerLink: { type: 'string' },
          curatorComment: { type: 'string' },
          shortDescription: { type: 'string' },
          details: { type: 'string' },
        },
      },
    },
  },
};

export const SPOTS_EXTRACT_PROMPT = [
  'Extract all recommended places, venues, restaurants, bars, cafes, and shops from this curated list page.',
  'For each place provide:',
  '- name: the venue/restaurant/shop name',
  '- tag: category - one of: eat, bar, cafes, go out, shops (infer from context if not explicit)',
  '- location: full street address or neighborhood location as shown',
  '- mapLink: Google Maps URL or any map link if shown on page',
  '- cornerLink: direct URL to this place\'s page on the source website',
  '- curatorComment: any editorial note, curator tip, or recommendation quote for this specific place',
  '- shortDescription: a one-sentence description of what makes this place notable',
  '- details: any additional relevant details (hours, price range, specialties, etc.)',
  'Only include actual place recommendations. Skip navigation links, ads, or author bios.',
].join('\n');

/**
 * Extract spots from a URL using Firecrawl's AI extraction.
 * Returns the raw places array or throws on failure/timeout.
 */
export async function extractSpotsFromUrl(
  sourceUrl: string,
  apiKey: string,
  options?: { timeoutMs?: number }
): Promise<RawExtractedPlace[]> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const res = await fetch(`${FIRECRAWL_BASE_URL}/v1/extract`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      urls: [sourceUrl],
      prompt: SPOTS_EXTRACT_PROMPT,
      schema: SPOTS_EXTRACT_SCHEMA,
      allowExternalLinks: false,
      includeSubdomains: false,
      enableWebSearch: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firecrawl extract failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = await res.json();

  if (json?.success === false) {
    throw new Error(`Firecrawl error: ${json.error || 'unknown'}`);
  }

  // Synchronous response — data is immediately available
  if (json?.data?.places) {
    return Array.isArray(json.data.places) ? json.data.places : [];
  }

  // Async response — need to poll for completion
  if (json?.id) {
    return pollExtractJob(json.id, apiKey, timeoutMs);
  }

  return [];
}

async function pollExtractJob(
  jobId: string,
  apiKey: string,
  timeoutMs: number
): Promise<RawExtractedPlace[]> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await fetch(`${FIRECRAWL_BASE_URL}/v1/extract/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Firecrawl poll failed (${res.status}): ${text.slice(0, 200)}`);
    }

    const json = await res.json();

    if (json?.success === false) {
      throw new Error(`Firecrawl poll error: ${json.error || 'unknown'}`);
    }

    if (json?.status === 'completed') {
      const places = json?.data?.places;
      return Array.isArray(places) ? places : [];
    }

    if (json?.status === 'failed' || json?.status === 'cancelled') {
      throw new Error(`Firecrawl extract job ${json.status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error('Firecrawl extract polling timed out');
}
