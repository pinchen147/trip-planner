import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAuthenticatedUserId } from './authz';

const tripLegValidator = v.object({
  cityId: v.string(),
  startDate: v.string(),
  endDate: v.string(),
});

const tripValidator = v.object({
  _id: v.id('trips'),
  userId: v.string(),
  urlId: v.optional(v.string()),
  name: v.string(),
  legs: v.array(tripLegValidator),
  createdAt: v.string(),
  updatedAt: v.string(),
});

export const listMyTrips = query({
  args: {},
  returns: v.array(tripValidator),
  handler: async (ctx) => {
    const userId = await requireAuthenticatedUserId(ctx);
    const rows = await ctx.db
      .query('trips')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    return rows
      .map(({ _creationTime, ...row }) => row)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
});

export const getTrip = query({
  args: { tripId: v.id('trips') },
  returns: v.union(v.null(), tripValidator),
  handler: async (ctx, args) => {
    const userId = await requireAuthenticatedUserId(ctx);
    const trip = await ctx.db.get(args.tripId);
    if (!trip) return null;

    // Allow access if user owns the trip or is a pair member on it
    if (trip.userId !== userId) {
      const membership = await ctx.db
        .query('pairMembers')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect();
      const hasAccess = membership.some((m) => m.tripId === args.tripId);
      if (!hasAccess) return null;
    }

    const { _creationTime, ...rest } = trip;
    return rest;
  },
});

export const getByUrlId = query({
  args: { urlId: v.string() },
  returns: v.union(v.null(), tripValidator),
  handler: async (ctx, args) => {
    const userId = await requireAuthenticatedUserId(ctx);
    const trip = await ctx.db
      .query('trips')
      .withIndex('by_url_id', (q) => q.eq('urlId', args.urlId))
      .first();
    if (!trip) return null;

    if (trip.userId !== userId) {
      const membership = await ctx.db
        .query('pairMembers')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect();
      const hasAccess = membership.some((m) => m.tripId === trip._id);
      if (!hasAccess) return null;
    }

    const { _creationTime, ...rest } = trip;
    return rest;
  },
});

export const createTrip = mutation({
  args: {
    name: v.string(),
    legs: v.array(tripLegValidator),
  },
  returns: tripValidator,
  handler: async (ctx, args) => {
    const userId = await requireAuthenticatedUserId(ctx);
    const now = new Date().toISOString();
    const urlId = crypto.randomUUID();

    if (args.legs.length === 0) {
      throw new Error('A trip must have at least one leg.');
    }

    const tripId = await ctx.db.insert('trips', {
      userId,
      urlId,
      name: args.name.trim() || 'Untitled Trip',
      legs: args.legs,
      createdAt: now,
      updatedAt: now,
    });

    // Create a default tripConfig from the first leg
    const firstLeg = args.legs[0];
    const city = await ctx.db
      .query('cities')
      .withIndex('by_slug', (q) => q.eq('slug', firstLeg.cityId))
      .first();

    await ctx.db.insert('tripConfig', {
      tripId,
      timezone: city?.timezone ?? 'UTC',
      tripStart: firstLeg.startDate,
      tripEnd: args.legs[args.legs.length - 1].endDate,
      updatedAt: now,
    });

    return {
      _id: tripId,
      userId,
      urlId,
      name: args.name.trim() || 'Untitled Trip',
      legs: args.legs,
      createdAt: now,
      updatedAt: now,
    };
  },
});

export const updateTrip = mutation({
  args: {
    tripId: v.id('trips'),
    name: v.optional(v.string()),
    legs: v.optional(v.array(tripLegValidator)),
  },
  returns: v.union(v.null(), tripValidator),
  handler: async (ctx, args) => {
    const userId = await requireAuthenticatedUserId(ctx);
    const trip = await ctx.db.get(args.tripId);
    if (!trip || trip.userId !== userId) return null;

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (args.name !== undefined) updates.name = args.name.trim() || trip.name;
    if (args.legs !== undefined) {
      if (args.legs.length === 0) {
        throw new Error('A trip must have at least one leg.');
      }
      updates.legs = args.legs;
    }

    await ctx.db.patch(args.tripId, updates);
    const updated = await ctx.db.get(args.tripId);
    if (!updated) return null;
    const { _creationTime, ...rest } = updated;
    return rest;
  },
});

export const deleteTrip = mutation({
  args: { tripId: v.id('trips') },
  returns: v.object({ deleted: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await requireAuthenticatedUserId(ctx);
    const trip = await ctx.db.get(args.tripId);
    if (!trip || trip.userId !== userId) return { deleted: false };

    // Delete tripConfig
    const config = await ctx.db
      .query('tripConfig')
      .withIndex('by_trip', (q) => q.eq('tripId', args.tripId))
      .first();
    if (config) await ctx.db.delete(config._id);

    // Delete planner entries
    const entries = await ctx.db
      .query('plannerEntries')
      .withIndex('by_trip_room', (q) => q.eq('tripId', args.tripId))
      .collect();
    for (const entry of entries) {
      await ctx.db.delete(entry._id);
    }

    // Delete pair rooms and members
    const rooms = await ctx.db
      .query('pairRooms')
      .withIndex('by_trip_room', (q) => q.eq('tripId', args.tripId))
      .collect();
    for (const room of rooms) {
      const members = await ctx.db
        .query('pairMembers')
        .withIndex('by_trip_room', (q) =>
          q.eq('tripId', args.tripId).eq('roomCode', room.roomCode)
        )
        .collect();
      for (const member of members) {
        await ctx.db.delete(member._id);
      }
      await ctx.db.delete(room._id);
    }

    await ctx.db.delete(args.tripId);
    return { deleted: true };
  },
});

// Backfill mutation: assign urlId to existing trips that don't have one
export const backfillUrlIds = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const userId = await requireAuthenticatedUserId(ctx);
    const rows = await ctx.db
      .query('trips')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    let count = 0;
    for (const row of rows) {
      if (!row.urlId) {
        await ctx.db.patch(row._id, { urlId: crypto.randomUUID() });
        count++;
      }
    }
    return count;
  },
});
