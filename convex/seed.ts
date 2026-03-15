import { mutation, internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { requireOwnerUserId } from './authz';

const SEED_CITIES = [
  {
    slug: 'san-francisco',
    name: 'San Francisco',
    timezone: 'America/Los_Angeles',
    locale: 'en-US',
    mapCenter: { lat: 37.7749, lng: -122.4194 },
    mapBounds: { north: 37.85, south: 37.68, east: -122.33, west: -122.55 },
    crimeAdapterId: 'sf-open-data',
  },
  {
    slug: 'new-york',
    name: 'New York',
    timezone: 'America/New_York',
    locale: 'en-US',
    mapCenter: { lat: 40.7128, lng: -74.006 },
    mapBounds: { north: 40.92, south: 40.49, east: -73.7, west: -74.26 },
    crimeAdapterId: 'nypd-open-data',
  },
  {
    slug: 'los-angeles',
    name: 'Los Angeles',
    timezone: 'America/Los_Angeles',
    locale: 'en-US',
    mapCenter: { lat: 34.0522, lng: -118.2437 },
    mapBounds: { north: 34.34, south: 33.7, east: -118.0, west: -118.67 },
    crimeAdapterId: 'lapd-open-data',
  },
  {
    slug: 'chicago',
    name: 'Chicago',
    timezone: 'America/Chicago',
    locale: 'en-US',
    mapCenter: { lat: 41.8781, lng: -87.6298 },
    mapBounds: { north: 42.02, south: 41.64, east: -87.52, west: -87.94 },
    crimeAdapterId: 'chicago-open-data',
  },
  {
    slug: 'london',
    name: 'London',
    timezone: 'Europe/London',
    locale: 'en-GB',
    mapCenter: { lat: 51.5074, lng: -0.1278 },
    mapBounds: { north: 51.69, south: 51.28, east: 0.34, west: -0.51 },
    crimeAdapterId: 'uk-police',
  },
  {
    slug: 'tokyo',
    name: 'Tokyo',
    timezone: 'Asia/Tokyo',
    locale: 'ja-JP',
    mapCenter: { lat: 35.6762, lng: 139.6503 },
    mapBounds: { north: 35.82, south: 35.5, east: 139.92, west: 139.56 },
    crimeAdapterId: '',
  },
];

async function seedCities(ctx: any) {
  const now = new Date().toISOString();
  let created = 0;

  for (const city of SEED_CITIES) {
    const existing = await ctx.db
      .query('cities')
      .withIndex('by_slug', (q: any) => q.eq('slug', city.slug))
      .first();

    if (!existing) {
      await ctx.db.insert('cities', {
        ...city,
        isSeeded: true,
        createdByUserId: 'system',
        createdAt: now,
        updatedAt: now,
      });
      created += 1;
    }
  }

  return { citiesCreated: created };
}

// Authenticated version (callable from frontend)
export const seedInitialData = mutation({
  args: {},
  returns: v.object({ citiesCreated: v.number() }),
  handler: async (ctx) => {
    await requireOwnerUserId(ctx);
    return seedCities(ctx);
  },
});

// Internal version (callable from CLI / dashboard without auth)
export const seedInitialDataInternal = internalMutation({
  args: {},
  returns: v.object({ citiesCreated: v.number() }),
  handler: async (ctx) => {
    return seedCities(ctx);
  },
});
