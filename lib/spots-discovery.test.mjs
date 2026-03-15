import { beforeEach, afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import ical from 'node-ical';
import { ConvexHttpClient } from 'convex/browser';

import { syncEvents, discoverSpotsIfNeeded } from './events.ts';

const EVENTS_CACHE_FILE = path.join(process.cwd(), 'data', 'events-cache.json');
const FIRECRAWL_EXTRACT_URL = 'https://api.firecrawl.dev/v1/extract';
const CORNER_LIST_URL = 'https://www.corner.inc/list/e65af393-70dd-46d5-948a-d774f472d2ee';

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_ICAL_FROM_URL = ical.async.fromURL;
const ORIGINAL_CONVEX_QUERY = ConvexHttpClient.prototype.query;
const ORIGINAL_CONVEX_MUTATION = ConvexHttpClient.prototype.mutation;
const ORIGINAL_ENV = {
  CONVEX_URL: process.env.CONVEX_URL,
  NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
  GOOGLE_MAPS_GEOCODING_KEY: process.env.GOOGLE_MAPS_GEOCODING_KEY,
  GOOGLE_MAPS_SERVER_KEY: process.env.GOOGLE_MAPS_SERVER_KEY,
  GOOGLE_MAPS_BROWSER_KEY: process.env.GOOGLE_MAPS_BROWSER_KEY,
};

let hadOriginalEventsCache = false;
let originalEventsCache = '';

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

beforeEach(async () => {
  try {
    originalEventsCache = await readFile(EVENTS_CACHE_FILE, 'utf-8');
    hadOriginalEventsCache = true;
  } catch {
    originalEventsCache = '';
    hadOriginalEventsCache = false;
  }

  process.env.CONVEX_URL = '';
  process.env.NEXT_PUBLIC_CONVEX_URL = '';
  process.env.GOOGLE_MAPS_GEOCODING_KEY = '';
  process.env.GOOGLE_MAPS_SERVER_KEY = '';
  process.env.GOOGLE_MAPS_BROWSER_KEY = '';
  process.env.FIRECRAWL_API_KEY = 'test-firecrawl-key';

  ical.async.fromURL = ORIGINAL_ICAL_FROM_URL;
  globalThis.fetch = ORIGINAL_FETCH;
  ConvexHttpClient.prototype.query = ORIGINAL_CONVEX_QUERY;
  ConvexHttpClient.prototype.mutation = ORIGINAL_CONVEX_MUTATION;
});

afterEach(async () => {
  restoreEnv();
  ical.async.fromURL = ORIGINAL_ICAL_FROM_URL;
  globalThis.fetch = ORIGINAL_FETCH;
  ConvexHttpClient.prototype.query = ORIGINAL_CONVEX_QUERY;
  ConvexHttpClient.prototype.mutation = ORIGINAL_CONVEX_MUTATION;

  if (hadOriginalEventsCache) {
    await writeFile(EVENTS_CACHE_FILE, originalEventsCache, 'utf-8');
  } else {
    await rm(EVENTS_CACHE_FILE, { force: true });
  }
});

function mockFirecrawlResponse(places) {
  return new Response(JSON.stringify({
    success: true,
    data: { places },
  }), { status: 200 });
}

describe('syncEvents spot extraction via Firecrawl', () => {
  it('calls Firecrawl for spot sources and includes extracted spots in payload', async () => {
    process.env.CONVEX_URL = 'https://mock.convex.cloud';

    const firecrawlCalls = [];
    let capturedSpots = null;

    ConvexHttpClient.prototype.query = async function query(functionName) {
      if (functionName === 'sources:listSources') {
        return [
          {
            _id: 'spot-source-1',
            sourceType: 'spot',
            url: 'https://www.corner.inc/list/test-list',
            label: 'Test Corner List',
            status: 'active',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ];
      }
      throw new Error(`Unexpected Convex query: ${functionName}`);
    };

    ConvexHttpClient.prototype.mutation = async function mutation(functionName, args) {
      if (functionName === 'spots:upsertSpots') {
        capturedSpots = args;
        return { spotCount: args?.spots?.length || 0, syncedAt: args?.syncedAt || '' };
      }
      if (functionName === 'events:upsertEvents') {
        return { eventCount: 0, syncedAt: args?.syncedAt || '' };
      }
      if (functionName === 'sources:updateSource') {
        return { ok: true };
      }
      throw new Error(`Unexpected Convex mutation: ${functionName}`);
    };

    ical.async.fromURL = async () => ({});

    globalThis.fetch = async (url) => {
      if (typeof url === 'string' && url.startsWith(FIRECRAWL_EXTRACT_URL)) {
        firecrawlCalls.push(url);
        return mockFirecrawlResponse([
          { name: 'Tartine Bakery', tag: 'cafes', location: '600 Guerrero St, SF', shortDescription: 'Amazing pastries' },
          { name: 'Beretta', tag: 'eat', location: '1199 Valencia St, SF', shortDescription: 'Italian cocktails' },
        ]);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };

    const payload = await syncEvents('test-city');

    assert.ok(firecrawlCalls.length > 0, 'should have called Firecrawl');
    assert.ok(payload.places.length >= 2, 'should include extracted spots');

    const names = payload.places.map((p) => p.name);
    assert.ok(names.includes('Tartine Bakery'), 'should include Tartine Bakery');
    assert.ok(names.includes('Beretta'), 'should include Beretta');
  });

  it('records ingestion error when Firecrawl fails', async () => {
    process.env.CONVEX_URL = 'https://mock.convex.cloud';

    ConvexHttpClient.prototype.query = async function query(functionName) {
      if (functionName === 'sources:listSources') {
        return [
          {
            _id: 'failing-source',
            sourceType: 'spot',
            url: 'https://www.corner.inc/list/broken',
            label: 'Broken List',
            status: 'active',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ];
      }
      throw new Error(`Unexpected Convex query: ${functionName}`);
    };

    ConvexHttpClient.prototype.mutation = async function mutation(functionName, args) {
      if (functionName === 'spots:upsertSpots') return { spotCount: 0 };
      if (functionName === 'events:upsertEvents') return { eventCount: 0 };
      if (functionName === 'sources:updateSource') return { ok: true };
      throw new Error(`Unexpected mutation: ${functionName}`);
    };

    ical.async.fromURL = async () => ({});

    globalThis.fetch = async (url) => {
      if (typeof url === 'string' && url.startsWith(FIRECRAWL_EXTRACT_URL)) {
        return new Response('Service Unavailable', { status: 503 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };

    const payload = await syncEvents('test-city');

    const spotErrors = payload.meta.ingestionErrors.filter(
      (e) => e.sourceType === 'spot' && e.stage === 'firecrawl'
    );
    assert.ok(spotErrors.length > 0, 'should record a Firecrawl error for the failing source');
    assert.ok(spotErrors[0].message.includes('503'), 'error should mention status code');
  });

  it('silently skips spot extraction when FIRECRAWL_API_KEY is missing', async () => {
    process.env.CONVEX_URL = 'https://mock.convex.cloud';
    process.env.FIRECRAWL_API_KEY = '';

    ConvexHttpClient.prototype.query = async function query(functionName) {
      if (functionName === 'sources:listSources') {
        return [
          {
            _id: 'no-key-source',
            sourceType: 'spot',
            url: 'https://www.corner.inc/list/valid',
            label: 'Valid List',
            status: 'active',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ];
      }
      throw new Error(`Unexpected query: ${functionName}`);
    };

    ConvexHttpClient.prototype.mutation = async function mutation(functionName, args) {
      if (functionName === 'spots:upsertSpots') return { spotCount: 0 };
      if (functionName === 'events:upsertEvents') return { eventCount: 0 };
      if (functionName === 'sources:updateSource') return { ok: true };
      throw new Error(`Unexpected mutation: ${functionName}`);
    };

    ical.async.fromURL = async () => ({});

    const payload = await syncEvents('test-city');

    const spotErrors = payload.meta.ingestionErrors.filter(
      (e) => e.sourceType === 'spot'
    );
    assert.equal(spotErrors.length, 0, 'should not record errors when API key is simply missing');
  });

  it('skips private/local spot source URLs', async () => {
    process.env.CONVEX_URL = 'https://mock.convex.cloud';

    ConvexHttpClient.prototype.query = async function query(functionName) {
      if (functionName === 'sources:listSources') {
        return [
          {
            _id: 'private-source',
            sourceType: 'spot',
            url: 'https://192.168.1.1/spots',
            label: 'Internal List',
            status: 'active',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ];
      }
      throw new Error(`Unexpected query: ${functionName}`);
    };

    ConvexHttpClient.prototype.mutation = async function mutation(functionName, args) {
      if (functionName === 'spots:upsertSpots') return { spotCount: 0 };
      if (functionName === 'events:upsertEvents') return { eventCount: 0 };
      if (functionName === 'sources:updateSource') return { ok: true };
      throw new Error(`Unexpected mutation: ${functionName}`);
    };

    ical.async.fromURL = async () => ({});

    const payload = await syncEvents('test-city');

    const validationErrors = payload.meta.ingestionErrors.filter(
      (e) => e.sourceType === 'spot' && e.stage === 'source_validation'
    );
    assert.ok(validationErrors.length > 0, 'should reject private URL');
  });

  it('normalizes tags from Firecrawl extraction output', async () => {
    process.env.CONVEX_URL = 'https://mock.convex.cloud';

    let capturedSpots = null;

    ConvexHttpClient.prototype.query = async function query(functionName) {
      if (functionName === 'sources:listSources') {
        return [
          {
            _id: 'tag-source',
            sourceType: 'spot',
            url: 'https://www.corner.inc/list/tags',
            label: 'Tag Test',
            status: 'active',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ];
      }
      throw new Error(`Unexpected query: ${functionName}`);
    };

    ConvexHttpClient.prototype.mutation = async function mutation(functionName, args) {
      if (functionName === 'spots:upsertSpots') {
        capturedSpots = args?.spots || [];
        return { spotCount: capturedSpots.length };
      }
      if (functionName === 'events:upsertEvents') return { eventCount: 0 };
      if (functionName === 'sources:updateSource') return { ok: true };
      throw new Error(`Unexpected mutation: ${functionName}`);
    };

    ical.async.fromURL = async () => ({});

    globalThis.fetch = async (url) => {
      if (typeof url === 'string' && url.startsWith(FIRECRAWL_EXTRACT_URL)) {
        return mockFirecrawlResponse([
          { name: 'Blue Bottle', tag: 'coffee shop', location: 'Ferry Building', shortDescription: 'Pour-over coffee' },
          { name: 'ABV', tag: 'cocktail bar', location: 'Mission', shortDescription: 'Craft cocktails' },
          { name: 'Amoeba Music', tag: 'record store', location: 'Haight', shortDescription: 'Vinyl paradise' },
          { name: 'Audio SF', tag: 'nightclub', location: 'SOMA', shortDescription: 'Late night beats' },
          { name: 'Burma Superstar', tag: '', location: 'Clement St', shortDescription: 'Burmese restaurant' },
        ]);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };

    await syncEvents('test-city');

    assert.ok(capturedSpots, 'should have saved spots');
    const byName = new Map(capturedSpots.map((s) => [s.name, s]));

    assert.equal(byName.get('Blue Bottle')?.tag, 'cafes', 'coffee shop → cafes');
    assert.equal(byName.get('ABV')?.tag, 'bar', 'cocktail bar → bar');
    assert.equal(byName.get('Amoeba Music')?.tag, 'shops', 'record store → shops');
    assert.equal(byName.get('Audio SF')?.tag, 'go out', 'nightclub → go out');
    assert.equal(byName.get('Burma Superstar')?.tag, 'eat', 'empty tag → eat');
  });
});

describe('discoverSpotsIfNeeded', () => {
  it('returns cached when spots already exist in Convex', async () => {
    process.env.CONVEX_URL = 'https://mock.convex.cloud';

    ConvexHttpClient.prototype.query = async function query(functionName) {
      if (functionName === 'spots:listSpots') {
        return [{ id: 'spot-1', name: 'Existing Spot', tag: 'eat' }];
      }
      if (functionName === 'spots:getSyncMeta') {
        return { key: 'test-city:events', syncedAt: '2026-01-01T00:00:00Z', calendars: [], eventCount: 1 };
      }
      throw new Error(`Unexpected query: ${functionName}`);
    };

    const result = await discoverSpotsIfNeeded('test-city');
    assert.equal(result.cached, true);
    assert.equal(result.spotCount, 1);
  });

  it('triggers Firecrawl when no spots exist', async () => {
    process.env.CONVEX_URL = 'https://mock.convex.cloud';

    let firecrawlCalled = false;
    let spotsSaved = false;

    ConvexHttpClient.prototype.query = async function query(functionName) {
      if (functionName === 'spots:listSpots') return [];
      if (functionName === 'spots:getSyncMeta') return null;
      if (functionName === 'sources:listSources') return [];
      throw new Error(`Unexpected query: ${functionName}`);
    };

    ConvexHttpClient.prototype.mutation = async function mutation(functionName, args) {
      if (functionName === 'spots:upsertSpots') {
        spotsSaved = true;
        return { spotCount: args?.spots?.length || 0 };
      }
      if (functionName === 'sources:updateSource') return { ok: true };
      throw new Error(`Unexpected mutation: ${functionName}`);
    };

    globalThis.fetch = async (url) => {
      if (typeof url === 'string' && url.startsWith(FIRECRAWL_EXTRACT_URL)) {
        firecrawlCalled = true;
        return mockFirecrawlResponse([
          { name: 'New Spot', tag: 'eat', location: 'Downtown LA' },
        ]);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };

    const result = await discoverSpotsIfNeeded('los-angeles');
    assert.equal(result.cached, false);
    assert.ok(firecrawlCalled, 'should have called Firecrawl');
    assert.ok(result.spotCount >= 1, 'should have discovered spots');
    assert.ok(spotsSaved, 'should have saved spots to Convex');
  });

  it('returns empty for blank cityId', async () => {
    const result = await discoverSpotsIfNeeded('');
    assert.equal(result.spotCount, 0);
    assert.equal(result.cached, false);
  });

  it('force bypasses cache check', async () => {
    process.env.CONVEX_URL = 'https://mock.convex.cloud';

    let queryCount = 0;
    let firecrawlCalled = false;

    ConvexHttpClient.prototype.query = async function query(functionName) {
      queryCount++;
      if (functionName === 'spots:listSpots') return [{ id: 'old-spot', name: 'Old', tag: 'eat' }];
      if (functionName === 'spots:getSyncMeta') return { key: 'test:events', syncedAt: '2026-01-01', calendars: [], eventCount: 1 };
      if (functionName === 'sources:listSources') return [];
      throw new Error(`Unexpected query: ${functionName}`);
    };

    ConvexHttpClient.prototype.mutation = async function mutation(functionName) {
      if (functionName === 'spots:upsertSpots') return { spotCount: 1 };
      if (functionName === 'sources:updateSource') return { ok: true };
      throw new Error(`Unexpected mutation: ${functionName}`);
    };

    globalThis.fetch = async (url) => {
      if (typeof url === 'string' && url.startsWith(FIRECRAWL_EXTRACT_URL)) {
        firecrawlCalled = true;
        return mockFirecrawlResponse([
          { name: 'Fresh Spot', tag: 'bar', location: 'Hollywood' },
        ]);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };

    const result = await discoverSpotsIfNeeded('los-angeles', { force: true });
    assert.equal(result.cached, false);
    assert.ok(firecrawlCalled, 'should call Firecrawl even with existing spots');
  });
});
