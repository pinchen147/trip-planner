import { beforeEach, afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { extractSpotsFromUrl, SPOTS_EXTRACT_SCHEMA, SPOTS_EXTRACT_PROMPT } from './firecrawl-spots.ts';

const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

describe('SPOTS_EXTRACT_SCHEMA', () => {
  it('has the expected top-level structure', () => {
    assert.equal(SPOTS_EXTRACT_SCHEMA.type, 'object');
    assert.ok(SPOTS_EXTRACT_SCHEMA.properties.places);
    assert.equal(SPOTS_EXTRACT_SCHEMA.properties.places.type, 'array');
  });

  it('defines all required place fields', () => {
    const fields = Object.keys(SPOTS_EXTRACT_SCHEMA.properties.places.items.properties);
    for (const expected of ['name', 'tag', 'location', 'mapLink', 'cornerLink', 'curatorComment', 'shortDescription', 'details']) {
      assert.ok(fields.includes(expected), `missing field: ${expected}`);
    }
  });
});

describe('SPOTS_EXTRACT_PROMPT', () => {
  it('mentions all valid tags', () => {
    for (const tag of ['eat', 'bar', 'cafes', 'go out', 'shops']) {
      assert.ok(SPOTS_EXTRACT_PROMPT.includes(tag), `prompt should mention tag: ${tag}`);
    }
  });

  it('asks for key fields', () => {
    for (const field of ['name', 'location', 'mapLink', 'curatorComment']) {
      assert.ok(SPOTS_EXTRACT_PROMPT.toLowerCase().includes(field.toLowerCase()), `prompt should mention: ${field}`);
    }
  });
});

describe('extractSpotsFromUrl', () => {
  it('returns places from a synchronous Firecrawl response', async () => {
    const mockPlaces = [
      { name: 'Test Cafe', tag: 'cafes', location: '123 Main St' },
      { name: 'Test Bar', tag: 'bar', location: '456 Oak Ave' },
    ];

    globalThis.fetch = async (url, opts) => {
      assert.ok(url.includes('/v1/extract'));
      const body = JSON.parse(opts.body);
      assert.deepEqual(body.urls, ['https://example.com/list']);
      assert.ok(body.prompt);
      assert.ok(body.schema);

      return new Response(JSON.stringify({
        success: true,
        data: { places: mockPlaces },
      }), { status: 200 });
    };

    const result = await extractSpotsFromUrl('https://example.com/list', 'test-key');
    assert.equal(result.length, 2);
    assert.equal(result[0].name, 'Test Cafe');
    assert.equal(result[1].name, 'Test Bar');
  });

  it('polls async Firecrawl jobs until completion', async () => {
    let pollCount = 0;

    globalThis.fetch = async (url, opts) => {
      // Initial POST — returns async job ID
      if (opts?.method === 'POST') {
        return new Response(JSON.stringify({
          success: true,
          id: 'job-123',
        }), { status: 200 });
      }

      // Poll GET requests
      pollCount++;
      assert.ok(url.includes('/v1/extract/job-123'));

      if (pollCount < 3) {
        return new Response(JSON.stringify({
          success: true,
          status: 'pending',
        }), { status: 200 });
      }

      return new Response(JSON.stringify({
        success: true,
        status: 'completed',
        data: { places: [{ name: 'Polled Place', tag: 'eat', location: 'Downtown' }] },
      }), { status: 200 });
    };

    const result = await extractSpotsFromUrl('https://example.com/list', 'test-key');
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Polled Place');
    assert.ok(pollCount >= 3, 'should have polled multiple times');
  });

  it('throws on Firecrawl HTTP error', async () => {
    globalThis.fetch = async () => {
      return new Response('Rate limited', { status: 429 });
    };

    await assert.rejects(
      () => extractSpotsFromUrl('https://example.com/list', 'test-key'),
      /429/
    );
  });

  it('throws on Firecrawl success=false response', async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid API key',
      }), { status: 200 });
    };

    await assert.rejects(
      () => extractSpotsFromUrl('https://example.com/list', 'test-key'),
      /Invalid API key/
    );
  });

  it('throws on failed job status', async () => {
    globalThis.fetch = async (url, opts) => {
      if (opts?.method === 'POST') {
        return new Response(JSON.stringify({ success: true, id: 'job-fail' }), { status: 200 });
      }

      return new Response(JSON.stringify({
        success: true,
        status: 'failed',
      }), { status: 200 });
    };

    await assert.rejects(
      () => extractSpotsFromUrl('https://example.com/list', 'test-key'),
      /failed/
    );
  });

  it('throws on poll timeout', async () => {
    globalThis.fetch = async (url, opts) => {
      if (opts?.method === 'POST') {
        return new Response(JSON.stringify({ success: true, id: 'job-slow' }), { status: 200 });
      }

      return new Response(JSON.stringify({
        success: true,
        status: 'pending',
      }), { status: 200 });
    };

    await assert.rejects(
      () => extractSpotsFromUrl('https://example.com/list', 'test-key', { timeoutMs: 100 }),
      /timed out/
    );
  });

  it('returns empty array when response has no places', async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        success: true,
        data: {},
      }), { status: 200 });
    };

    const result = await extractSpotsFromUrl('https://example.com/list', 'test-key');
    assert.deepEqual(result, []);
  });

  it('sends correct auth header', async () => {
    let capturedHeaders = null;

    globalThis.fetch = async (url, opts) => {
      capturedHeaders = opts.headers;
      return new Response(JSON.stringify({
        success: true,
        data: { places: [] },
      }), { status: 200 });
    };

    await extractSpotsFromUrl('https://example.com/list', 'my-secret-key');
    assert.equal(capturedHeaders.Authorization, 'Bearer my-secret-key');
  });
});
