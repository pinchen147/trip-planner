import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAuthenticatedUserId, requireOwnerUserId } from './authz';

const tripConfigValidator = v.object({
  tripId: v.id('trips'),
  timezone: v.string(),
  tripStart: v.string(),
  tripEnd: v.string(),
  baseLocation: v.string(),
  updatedAt: v.union(v.null(), v.string())
});
const saveTripConfigResultValidator = v.object({
  tripStart: v.string(),
  tripEnd: v.string()
});

export const getTripConfig = query({
  args: {
    tripId: v.id('trips')
  },
  returns: tripConfigValidator,
  handler: async (ctx, args) => {
    await requireAuthenticatedUserId(ctx);
    const row = await ctx.db
      .query('tripConfig')
      .withIndex('by_trip', (q) => q.eq('tripId', args.tripId))
      .first();

    if (!row) {
      return { tripId: args.tripId, timezone: 'UTC', tripStart: '', tripEnd: '', baseLocation: '', updatedAt: null };
    }

    return {
      tripId: row.tripId,
      timezone: row.timezone,
      tripStart: row.tripStart,
      tripEnd: row.tripEnd,
      baseLocation: row.baseLocation ?? '',
      updatedAt: row.updatedAt
    };
  }
});

export const saveTripConfig = mutation({
  args: {
    tripId: v.id('trips'),
    timezone: v.optional(v.string()),
    tripStart: v.string(),
    tripEnd: v.string(),
    baseLocation: v.optional(v.string()),
    updatedAt: v.string()
  },
  returns: saveTripConfigResultValidator,
  handler: async (ctx, args) => {
    await requireOwnerUserId(ctx);

    const existing = await ctx.db
      .query('tripConfig')
      .withIndex('by_trip', (q) => q.eq('tripId', args.tripId))
      .first();
    const shouldUpdateBaseLocation = args.baseLocation !== undefined;
    const nextBaseLocation = shouldUpdateBaseLocation ? args.baseLocation : existing?.baseLocation;

    const nextValue: {
      tripId: typeof args.tripId;
      timezone: string;
      tripStart: string;
      tripEnd: string;
      updatedAt: string;
      baseLocation?: string;
    } = {
      tripId: args.tripId,
      timezone: args.timezone ?? existing?.timezone ?? 'UTC',
      tripStart: args.tripStart,
      tripEnd: args.tripEnd,
      updatedAt: args.updatedAt
    };
    if (shouldUpdateBaseLocation) {
      nextValue.baseLocation = nextBaseLocation;
    }

    if (existing) {
      const shouldPatch = existing.tripStart !== args.tripStart ||
        existing.tripEnd !== args.tripEnd ||
        (args.timezone !== undefined && existing.timezone !== args.timezone) ||
        (shouldUpdateBaseLocation && existing.baseLocation !== nextBaseLocation);
      if (shouldPatch) {
        await ctx.db.patch(existing._id, nextValue);
      }
    } else {
      await ctx.db.insert('tripConfig', nextValue);
    }

    return { tripStart: args.tripStart, tripEnd: args.tripEnd };
  }
});
