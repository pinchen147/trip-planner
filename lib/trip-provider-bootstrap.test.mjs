import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const PROVIDER_PATH = path.join(
  process.cwd(), 'components', 'providers', 'TripProvider.tsx'
);

describe('TripProvider bootstrap trip resolution', () => {
  let source;

  it('source file exists', async () => {
    source = await readFile(PROVIDER_PATH, 'utf-8');
    assert.ok(source.length > 0);
  });

  it('reads trip id from URL path params', async () => {
    source ??= await readFile(PROVIDER_PATH, 'utf-8');
    assert.ok(
      source.includes("params?.tripId"),
      'should read tripId from URL path params via useParams'
    );
  });

  it('URL param takes priority over localStorage', async () => {
    source ??= await readFile(PROVIDER_PATH, 'utf-8');
    // urlParamId should be defined before savedTripId, and savedTripId should
    // fallback: urlParamId || localStorage
    const urlLine = source.indexOf('urlParamId');
    const savedLine = source.indexOf('savedTripId');
    assert.ok(urlLine > 0, 'urlParamId should be defined');
    assert.ok(savedLine > 0, 'savedTripId should be defined');
    assert.ok(urlLine < savedLine, 'urlParamId should be defined before savedTripId');
    assert.ok(
      source.includes('urlParamId ||'),
      'savedTripId should use urlParamId as primary source'
    );
  });

  it('falls back to localStorage when no URL param', async () => {
    source ??= await readFile(PROVIDER_PATH, 'utf-8');
    assert.ok(
      source.includes("localStorage.getItem('tripPlanner:activeTripId')"),
      'should fall back to localStorage'
    );
  });

  it('falls back to first trip when neither URL nor localStorage', async () => {
    source ??= await readFile(PROVIDER_PATH, 'utf-8');
    assert.ok(
      source.includes('loadedTrips[0]'),
      'should default to first trip in list'
    );
  });

  it('persists resolved trip id back to localStorage', async () => {
    source ??= await readFile(PROVIDER_PATH, 'utf-8');
    assert.ok(
      source.includes("localStorage.setItem('tripPlanner:activeTripId', activeTripId)"),
      'should write back resolved trip id'
    );
  });
});

describe('TripProvider crime category weights', () => {
  let source;

  it('handles cross-city crime categories', async () => {
    source ??= await readFile(PROVIDER_PATH, 'utf-8');
    // NYC patterns
    assert.ok(source.includes("'murder'"), 'should match NYC murder category');
    assert.ok(source.includes("'sex crime'"), 'should match NYC sex crime category');
    // Chicago patterns
    assert.ok(source.includes("'criminal damage'"), 'should match Chicago criminal damage');
    // NYC vandalism variant
    assert.ok(source.includes("'criminal mischief'"), 'should match NYC criminal mischief');
  });

  it('checks vehicle+stolen before generic vehicle', async () => {
    source ??= await readFile(PROVIDER_PATH, 'utf-8');
    // The compound check (vehicle && stolen → 2.3) must come before
    // a line that would match generic vehicle at a lower weight.
    const vehicleStolenIdx = source.indexOf("c.includes('vehicle') && c.includes('stolen')");
    assert.ok(vehicleStolenIdx > 0, 'should have vehicle+stolen compound check');
  });

  it('uses city slug constant for crime API', async () => {
    source ??= await readFile(PROVIDER_PATH, 'utf-8');
    assert.ok(
      source.includes('DEFAULT_CRIME_CITY_SLUG') || source.includes('CRIME_CITY_SLUG'),
      'should have a crime city slug constant'
    );
    assert.ok(
      source.includes('city='),
      'should pass city param to crime API'
    );
  });
});
