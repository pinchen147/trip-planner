import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DASHBOARD_PATH = path.join(process.cwd(), 'app', 'dashboard', 'page.tsx');

describe('dashboard page', () => {
  let source;

  it('source file exists and is readable', async () => {
    source = await readFile(DASHBOARD_PATH, 'utf-8');
    assert.ok(source.length > 0);
  });

  it('fetches from /api/trips and /api/cities', async () => {
    source ??= await readFile(DASHBOARD_PATH, 'utf-8');
    assert.ok(source.includes("fetch('/api/trips')"), 'should fetch trips from API');
    assert.ok(source.includes("fetch('/api/cities')"), 'should fetch cities from API');
  });

  it('does not import MOCK_TRIPS for rendering', async () => {
    source ??= await readFile(DASHBOARD_PATH, 'utf-8');
    assert.ok(!source.includes('MOCK_TRIPS'), 'should not use MOCK_TRIPS');
  });

  it('stores active trip id in localStorage on click', async () => {
    source ??= await readFile(DASHBOARD_PATH, 'utf-8');
    assert.ok(
      source.includes("localStorage.setItem('tripPlanner:activeTripId'"),
      'should persist trip id to localStorage'
    );
  });

  it('navigates to /trips/{urlId}/map on trip click', async () => {
    source ??= await readFile(DASHBOARD_PATH, 'utf-8');
    assert.ok(
      source.includes('/trips/') && source.includes('.urlId'),
      'should navigate to /trips/{urlId}/map'
    );
  });

  it('uses real trip._id not mock id', async () => {
    source ??= await readFile(DASHBOARD_PATH, 'utf-8');
    assert.ok(source.includes('trip._id'), 'should reference _id (Convex doc id)');
    assert.ok(!source.includes('trip.id}'), 'should not use mock .id property');
  });

  it('has loading state', async () => {
    source ??= await readFile(DASHBOARD_PATH, 'utf-8');
    assert.ok(source.includes('loading'), 'should track loading state');
    assert.ok(source.includes('Loader2') || source.includes('animate-spin'), 'should show spinner');
  });

  it('has error state', async () => {
    source ??= await readFile(DASHBOARD_PATH, 'utf-8');
    assert.ok(source.includes('error'), 'should track error state');
    assert.ok(source.includes('Failed to load trips'), 'should show error message');
  });

  it('has empty state', async () => {
    source ??= await readFile(DASHBOARD_PATH, 'utf-8');
    assert.ok(source.includes('trips.length === 0'), 'should handle empty trips');
    assert.ok(source.includes('No trips yet'), 'should show empty state message');
  });

  it('cleans up on unmount', async () => {
    source ??= await readFile(DASHBOARD_PATH, 'utf-8');
    assert.ok(source.includes('mounted = false'), 'should set mounted flag on cleanup');
  });

  it('passes onSelect to CityPickerModal', async () => {
    source ??= await readFile(DASHBOARD_PATH, 'utf-8');
    assert.ok(
      source.includes('onSelect={handleCitySelect}') || source.includes('onSelect='),
      'should wire onSelect callback to modal'
    );
  });

  it('creates trip via POST /api/trips on city select', async () => {
    source ??= await readFile(DASHBOARD_PATH, 'utf-8');
    assert.ok(
      source.includes("fetch('/api/trips'") && source.includes("method: 'POST'"),
      'should POST to /api/trips to create a trip'
    );
  });

  it('sends legs with cityId, startDate, endDate', async () => {
    source ??= await readFile(DASHBOARD_PATH, 'utf-8');
    assert.ok(source.includes('cityId:'), 'should include cityId in leg');
    assert.ok(source.includes('startDate'), 'should include startDate in leg');
    assert.ok(source.includes('endDate'), 'should include endDate in leg');
  });

  it('navigates to new trip after creation', async () => {
    source ??= await readFile(DASHBOARD_PATH, 'utf-8');
    assert.ok(source.includes('newTrip.urlId'), 'should use new trip urlId for navigation');
  });
});
