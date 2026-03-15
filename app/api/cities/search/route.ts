import { requireAuthenticatedClient } from '@/lib/request-auth';
import { consumeRateLimit, getRequestRateLimitIp } from '@/lib/security';
import { ApiCache } from '@/lib/api-cache';

export const runtime = 'nodejs';

// ---------------------------------------------------------------------------
// City alias map — maps abbreviations, nicknames, and airport codes to the
// canonical Google Places placeId so "LA", "NYC", "SF" etc. return the
// correct city instantly without relying on Google's fuzzy matching.
// ---------------------------------------------------------------------------
interface AliasEntry {
  placeId: string;
  mainText: string;
  secondaryText: string;
  aliases: string[];
}

const CITY_ALIASES: AliasEntry[] = [
  // United States
  { placeId: 'ChIJE9on3F3HwoAR9AhGJW_fL-I', mainText: 'Los Angeles', secondaryText: 'California, USA', aliases: ['la', 'lax', 'los angeles', 'city of angels'] },
  { placeId: 'ChIJIQBpAG2ahYAR_6128GcTUEo', mainText: 'San Francisco', secondaryText: 'California, USA', aliases: ['sf', 'sfo', 'san fran', 'frisco', 'san francisco'] },
  { placeId: 'ChIJOwg_06VPwokRYv534QaPC8g', mainText: 'New York', secondaryText: 'New York, USA', aliases: ['nyc', 'ny', 'jfk', 'new york', 'new york city', 'big apple', 'manhattan'] },
  { placeId: 'ChIJ7cv00DwsDogRAMDACa2m4K8', mainText: 'Chicago', secondaryText: 'Illinois, USA', aliases: ['chi', 'ord', 'chicago', 'windy city', 'chi-town', 'chitown'] },
  { placeId: 'ChIJGzE9DS1l44kRoOhiASS_fHg', mainText: 'Boston', secondaryText: 'Massachusetts, USA', aliases: ['bos', 'boston', 'beantown'] },
  { placeId: 'ChIJtGC3lC1CZIgRbLwOPwQRa00', mainText: 'Miami', secondaryText: 'Florida, USA', aliases: ['mia', 'miami', 'magic city'] },
  { placeId: 'ChIJqUCGZ09YBYgR3p2-0T5Bgyc', mainText: 'Washington D.C.', secondaryText: 'District of Columbia, USA', aliases: ['dc', 'dca', 'iad', 'washington', 'washington dc', 'dmv'] },
  { placeId: 'ChIJC-mvDPnKlVQRCNPOiRiNbAQ', mainText: 'Seattle', secondaryText: 'Washington, USA', aliases: ['sea', 'seattle', 'emerald city'] },
  { placeId: 'ChIJJ3SpfQsLkFQRkYXR9ua5Nhw', mainText: 'Portland', secondaryText: 'Oregon, USA', aliases: ['pdx', 'portland'] },
  { placeId: 'ChIJSx6SrQ9T2YARed8V_a0nbDg', mainText: 'Las Vegas', secondaryText: 'Nevada, USA', aliases: ['lv', 'las', 'vegas', 'las vegas', 'sin city'] },
  { placeId: 'ChIJ60u11Ni3xokRwVg-jNgU9Yk', mainText: 'Philadelphia', secondaryText: 'Pennsylvania, USA', aliases: ['phl', 'philly', 'philadelphia'] },
  { placeId: 'ChIJLwPMoJm1RIYRetVp1EtGm10', mainText: 'Austin', secondaryText: 'Texas, USA', aliases: ['aus', 'austin', 'atx'] },
  { placeId: 'ChIJAYWNSLS4QIYROwVl894CDco', mainText: 'Houston', secondaryText: 'Texas, USA', aliases: ['hou', 'iah', 'houston', 'h-town', 'htown'] },
  { placeId: 'ChIJS5dFe_cZTIYRj2dH9qSb7Lk', mainText: 'Dallas', secondaryText: 'Texas, USA', aliases: ['dfw', 'dallas', 'big d'] },
  { placeId: 'ChIJVTPokywQkFQRmtVEaUZlJRA', mainText: 'Denver', secondaryText: 'Colorado, USA', aliases: ['den', 'denver', 'mile high city'] },
  { placeId: 'ChIJW-T2Wt7Gt4kRKl2I1CJFUsI', mainText: 'Atlanta', secondaryText: 'Georgia, USA', aliases: ['atl', 'atlanta', 'hotlanta'] },
  { placeId: 'ChIJK-PSEiVFwokRsqrKTRECctQ', mainText: 'Nashville', secondaryText: 'Tennessee, USA', aliases: ['bna', 'nashville', 'nash', 'music city'] },
  { placeId: 'ChIJ0RhONcBEFIYRvCnB2w3LCNQ', mainText: 'San Antonio', secondaryText: 'Texas, USA', aliases: ['sat', 'san antonio', 'sa'] },
  { placeId: 'ChIJk1_Sr1RNIIgR3EMw_cMNoko', mainText: 'Detroit', secondaryText: 'Michigan, USA', aliases: ['dtw', 'detroit', 'motor city', 'motown'] },
  { placeId: 'ChIJGShJ02zKt4kRGQvszMufHWA', mainText: 'New Orleans', secondaryText: 'Louisiana, USA', aliases: ['msy', 'nola', 'new orleans', 'big easy'] },
  { placeId: 'ChIJybDUc_xKtokRv3USEVxGTFA', mainText: 'Honolulu', secondaryText: 'Hawaii, USA', aliases: ['hnl', 'honolulu', 'hawaii'] },
  // Europe
  { placeId: 'ChIJdd4hrwug2EcRmSrV3Vo6llI', mainText: 'London', secondaryText: 'United Kingdom', aliases: ['lon', 'lhr', 'lgw', 'london'] },
  { placeId: 'ChIJD7fiBh9u5kcRYJSMaMOCCwQ', mainText: 'Paris', secondaryText: 'France', aliases: ['par', 'cdg', 'paris', 'city of light', 'city of lights'] },
  { placeId: 'ChIJAVkDPzdOqEcRcDteW0YgIQQ', mainText: 'Berlin', secondaryText: 'Germany', aliases: ['ber', 'berlin'] },
  { placeId: 'ChIJ5TCOcRaYpBIRCmZHTz37sEQ', mainText: 'Barcelona', secondaryText: 'Spain', aliases: ['bcn', 'barcelona', 'barca'] },
  { placeId: 'ChIJu46S-ZZhLxMROG5lkwZ3D7k', mainText: 'Rome', secondaryText: 'Italy', aliases: ['fco', 'rome', 'roma', 'eternal city'] },
  { placeId: 'ChIJ2V-Mo_l1nkcRfZixfUq4DAE', mainText: 'Amsterdam', secondaryText: 'Netherlands', aliases: ['ams', 'amsterdam', 'a-dam'] },
  { placeId: 'ChIJn8o2UZ4HbUcRRluiUMH8ypI', mainText: 'Vienna', secondaryText: 'Austria', aliases: ['vie', 'vienna', 'wien'] },
  { placeId: 'ChIJrRMgU7ZhqEcRWnPAFSaUiSM', mainText: 'Prague', secondaryText: 'Czech Republic', aliases: ['prg', 'prague', 'praha'] },
  { placeId: 'ChIJb_rCdJb7pBIR3pyweFqm5ig', mainText: 'Madrid', secondaryText: 'Spain', aliases: ['mad', 'madrid'] },
  { placeId: 'ChIJhRTXUeeQyRIR_RMp6UtQims', mainText: 'Lisbon', secondaryText: 'Portugal', aliases: ['lis', 'lisbon', 'lisboa'] },
  { placeId: 'ChIJKxDbe_lYwDkRVf__s8CPqHk', mainText: 'Dublin', secondaryText: 'Ireland', aliases: ['dub', 'dublin'] },
  { placeId: 'ChIJa76xwh5ymkcRW-e6PAszT4g', mainText: 'Munich', secondaryText: 'Germany', aliases: ['muc', 'munich', 'munchen', 'münchen'] },
  { placeId: 'ChIJ0RhYNiS2EmsRLBx5wJIDPQQ', mainText: 'Copenhagen', secondaryText: 'Denmark', aliases: ['cph', 'copenhagen', 'kobenhavn'] },
  { placeId: 'ChIJcWGw3MJNHQcR1tRDlUlvBTY', mainText: 'Istanbul', secondaryText: 'Turkey', aliases: ['ist', 'istanbul', 'constantinople'] },
  // Asia
  { placeId: 'ChIJ51cu8IcbXWARiRtXIothAS4', mainText: 'Tokyo', secondaryText: 'Japan', aliases: ['tyo', 'nrt', 'hnd', 'tokyo'] },
  { placeId: 'ChIJSbfVfm7fS0YRSGz9OPOO5Tc', mainText: 'Seoul', secondaryText: 'South Korea', aliases: ['sel', 'icn', 'seoul'] },
  { placeId: 'ChIJByjqov3-STQRyFHazRMcAAQ', mainText: 'Osaka', secondaryText: 'Japan', aliases: ['kix', 'osaka'] },
  { placeId: 'ChIJOwE7_GTdQDQRFmMeSYS5RJU', mainText: 'Taipei', secondaryText: 'Taiwan', aliases: ['tpe', 'taipei'] },
  { placeId: 'ChIJByjqov3-STERyFHazRMcAAQ', mainText: 'Hong Kong', secondaryText: 'China', aliases: ['hkg', 'hk', 'hong kong', 'hongkong'] },
  { placeId: 'ChIJ82ENKDJgHTERIEjiXbIAAQE', mainText: 'Singapore', secondaryText: 'Singapore', aliases: ['sin', 'sg', 'singapore'] },
  { placeId: 'ChIJ1T1NL2iAHDER4eVOMpVF7ZA', mainText: 'Bangkok', secondaryText: 'Thailand', aliases: ['bkk', 'bangkok'] },
  { placeId: 'ChIJNylJMU0sBDQRtIFXBPWBMlQ', mainText: 'Shanghai', secondaryText: 'China', aliases: ['sha', 'pvg', 'shanghai'] },
  { placeId: 'ChIJP3Sa8ziYEmsRUKgyFmh9AQM', mainText: 'Sydney', secondaryText: 'Australia', aliases: ['syd', 'sydney'] },
  { placeId: 'ChIJ38WHZwf9KysRUhNblaFnglM', mainText: 'Melbourne', secondaryText: 'Australia', aliases: ['mel', 'melbourne'] },
  // Latin America
  { placeId: 'ChIJJ0vwYkluSEARkQQnMnW9S0k', mainText: 'Mexico City', secondaryText: 'Mexico', aliases: ['mex', 'cdmx', 'mexico city', 'df'] },
  { placeId: 'ChIJW5-1caa6j4AR-IHkSdOEJI0', mainText: 'Buenos Aires', secondaryText: 'Argentina', aliases: ['eze', 'bue', 'buenos aires', 'ba'] },
  { placeId: 'ChIJY56IYBXKj4ARTOpsJSsZ4tE', mainText: 'São Paulo', secondaryText: 'Brazil', aliases: ['gru', 'sao paulo', 'sp', 'sampa'] },
  { placeId: 'ChIJW6AIkVXemwAR0Gk6TjjLG3M', mainText: 'Rio de Janeiro', secondaryText: 'Brazil', aliases: ['gig', 'rio', 'rio de janeiro'] },
  { placeId: 'ChIJ0WGkg4FEzpQRrlsz_whLqZs', mainText: 'Bogotá', secondaryText: 'Colombia', aliases: ['bog', 'bogota'] },
  { placeId: 'ChIJ-cQi-E_KJIcR0v0wrPNKXp0', mainText: 'Lima', secondaryText: 'Peru', aliases: ['lim', 'lima'] },
  // Middle East / Africa
  { placeId: 'ChIJRcbZaklDXz4RYlEphFBu5r0', mainText: 'Dubai', secondaryText: 'United Arab Emirates', aliases: ['dxb', 'dubai'] },
  { placeId: 'ChIJk7LSNHhFHRURVsHvAUy4fOg', mainText: 'Tel Aviv', secondaryText: 'Israel', aliases: ['tlv', 'tel aviv'] },
  { placeId: 'ChIJlaTvThAEfBQRO6q3DnVJ8bQ', mainText: 'Cape Town', secondaryText: 'South Africa', aliases: ['cpt', 'cape town'] },
];

function findAliasMatches(input: string): { placeId: string; mainText: string; secondaryText: string }[] {
  const q = input.toLowerCase().trim();
  if (!q) return [];

  const scored: { entry: AliasEntry; score: number }[] = [];

  for (const entry of CITY_ALIASES) {
    let bestScore = 0;

    for (const alias of entry.aliases) {
      if (alias === q) {
        // Exact match — highest priority
        bestScore = Math.max(bestScore, 100);
      } else if (alias.startsWith(q)) {
        // Prefix match — scored by how much of the alias is covered
        bestScore = Math.max(bestScore, 50 + (q.length / alias.length) * 40);
      } else if (q.length >= 3 && alias.includes(q)) {
        // Substring match — lower priority, only for 3+ char queries
        bestScore = Math.max(bestScore, 30);
      }
    }

    if (bestScore > 0) {
      scored.push({ entry, score: bestScore });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => ({
      placeId: s.entry.placeId,
      mainText: s.entry.mainText,
      secondaryText: s.entry.secondaryText,
    }));
}

// Cache autocomplete results: same query → same predictions for 5 minutes
const searchCache = new ApiCache<any[]>(200);
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET(request: Request) {
  const auth = await requireAuthenticatedClient();
  if (auth.deniedResponse || !auth.client) return auth.deniedResponse!;

  const rateLimit = consumeRateLimit({
    key: `api:city-search:${getRequestRateLimitIp(request)}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return Response.json(
      { error: 'Too many search requests. Please retry shortly.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    );
  }

  const url = new URL(request.url);
  const input = (url.searchParams.get('q') || '').trim().toLowerCase();
  if (input.length < 2) {
    return Response.json({ predictions: [] });
  }

  // Check cache first
  const cacheKey = `search:${input}`;
  const cached = searchCache.get(cacheKey);
  if (cached) {
    return Response.json({ predictions: cached });
  }

  // Search local alias map first
  const aliasMatches = findAliasMatches(input);

  const apiKey =
    process.env.GOOGLE_MAPS_GEOCODING_KEY ||
    process.env.GOOGLE_MAPS_SERVER_KEY ||
    process.env.GOOGLE_MAPS_BROWSER_KEY ||
    '';
  if (!apiKey) {
    // No API key — return alias matches only
    if (aliasMatches.length > 0) {
      searchCache.set(cacheKey, aliasMatches, SEARCH_CACHE_TTL_MS);
      return Response.json({ predictions: aliasMatches });
    }
    return Response.json({ error: 'No Google Maps API key configured' }, { status: 500 });
  }

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input,
        includedPrimaryTypes: ['(cities)'],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      // If Google fails but we have alias matches, return those
      if (aliasMatches.length > 0) {
        searchCache.set(cacheKey, aliasMatches, SEARCH_CACHE_TTL_MS);
        return Response.json({ predictions: aliasMatches });
      }
      return Response.json(
        { error: data.error?.message || 'Places autocomplete failed' },
        { status: 502 }
      );
    }

    const googlePredictions = (data.suggestions || [])
      .filter((s: any) => s.placePrediction)
      .map((s: any) => ({
        placeId: s.placePrediction.placeId,
        mainText: s.placePrediction.structuredFormat?.mainText?.text || s.placePrediction.text?.text || '',
        secondaryText: s.placePrediction.structuredFormat?.secondaryText?.text || '',
      }));

    // Merge: alias matches first, then Google results (deduplicated by placeId)
    const seenPlaceIds = new Set(aliasMatches.map((a) => a.placeId));
    const merged = [
      ...aliasMatches,
      ...googlePredictions.filter((p: any) => !seenPlaceIds.has(p.placeId)),
    ].slice(0, 8);

    searchCache.set(cacheKey, merged, SEARCH_CACHE_TTL_MS);

    return Response.json({ predictions: merged });
  } catch (err) {
    // If Google request fails but we have alias matches, return those
    if (aliasMatches.length > 0) {
      searchCache.set(cacheKey, aliasMatches, SEARCH_CACHE_TTL_MS);
      return Response.json({ predictions: aliasMatches });
    }
    return Response.json(
      { error: err instanceof Error ? err.message : 'Places search failed' },
      { status: 500 }
    );
  }
}
