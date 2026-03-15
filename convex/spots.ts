import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAuthenticatedUserId, requireOwnerUserId } from './authz';

const spotValidator = v.object({
  id: v.string(),
  name: v.string(),
  tag: v.string(),
  location: v.string(),
  mapLink: v.string(),
  cornerLink: v.string(),
  curatorComment: v.string(),
  description: v.string(),
  details: v.string(),
  lat: v.optional(v.number()),
  lng: v.optional(v.number()),
  sourceId: v.optional(v.string()),
  sourceUrl: v.optional(v.string()),
  confidence: v.optional(v.number())
});
const spotRecordValidator = v.object({
  cityId: v.string(),
  id: v.string(),
  name: v.string(),
  tag: v.string(),
  location: v.string(),
  mapLink: v.string(),
  cornerLink: v.string(),
  curatorComment: v.string(),
  description: v.string(),
  details: v.string(),
  lat: v.optional(v.number()),
  lng: v.optional(v.number()),
  sourceId: v.optional(v.string()),
  sourceUrl: v.optional(v.string()),
  confidence: v.optional(v.number()),
  missedSyncCount: v.optional(v.number()),
  isDeleted: v.optional(v.boolean()),
  lastSeenAt: v.optional(v.string()),
  updatedAt: v.optional(v.string())
});
const syncMetaValidator = v.object({
  key: v.string(),
  syncedAt: v.string(),
  calendars: v.array(v.string()),
  eventCount: v.number()
});
const upsertSpotsResultValidator = v.object({
  spotCount: v.number(),
  syncedAt: v.string()
});

export const listSpots = query({
  args: {
    cityId: v.string()
  },
  returns: v.array(spotRecordValidator),
  handler: async (ctx, args) => {
    await requireAuthenticatedUserId(ctx);
    const rows = await ctx.db
      .query('spots')
      .withIndex('by_city', (q) => q.eq('cityId', args.cityId))
      .collect();

    return rows
      .filter((spot) => !spot.isDeleted)
      .map(({ _creationTime, _id, ...spot }) => spot)
      .sort((left, right) => `${left.tag}|${left.name}`.localeCompare(`${right.tag}|${right.name}`));
  }
});

export const getSyncMeta = query({
  args: {
    cityId: v.string()
  },
  returns: v.union(v.null(), syncMetaValidator),
  handler: async (ctx, args) => {
    await requireAuthenticatedUserId(ctx);
    const metaKey = `${args.cityId}:spots`;
    const row = await ctx.db.query('syncMeta').withIndex('by_key', (q) => q.eq('key', metaKey)).first();

    if (!row) {
      return null;
    }

    const { _creationTime, _id, ...meta } = row;
    return meta;
  }
});

export const upsertSpots = mutation({
  args: {
    cityId: v.string(),
    spots: v.array(spotValidator),
    syncedAt: v.string(),
    sourceUrls: v.array(v.string()),
    missedSyncThreshold: v.optional(v.number())
  },
  returns: upsertSpotsResultValidator,
  handler: async (ctx, args) => {
    await requireOwnerUserId(ctx);

    const missedSyncThreshold = Math.max(1, Number(args.missedSyncThreshold) || 2);
    const keepIds = new Set(args.spots.map((spot) => spot.id));
    const existingRows = await ctx.db
      .query('spots')
      .withIndex('by_city', (q) => q.eq('cityId', args.cityId))
      .collect();
    const existingById = new Map(existingRows.map((row) => [row.id, row]));

    for (const row of existingRows) {
      if (!keepIds.has(row.id)) {
        const nextMissedSyncCount = (Number(row.missedSyncCount) || 0) + 1;
        const isDeleted = nextMissedSyncCount >= missedSyncThreshold;

        await ctx.db.patch(row._id, {
          missedSyncCount: nextMissedSyncCount,
          isDeleted,
          updatedAt: args.syncedAt
        });
      }
    }

    for (const spot of args.spots) {
      const existing = existingById.get(spot.id);
      const nextSpot = {
        cityId: args.cityId,
        ...spot,
        missedSyncCount: 0,
        isDeleted: false,
        lastSeenAt: args.syncedAt,
        updatedAt: args.syncedAt
      };

      if (existing) {
        await ctx.db.patch(existing._id, nextSpot);
      } else {
        await ctx.db.insert('spots', nextSpot);
      }
    }

    const metaKey = `${args.cityId}:spots`;
    const existingMeta = await ctx.db
      .query('syncMeta')
      .withIndex('by_key', (q) => q.eq('key', metaKey))
      .first();

    const nextMeta = {
      key: metaKey,
      syncedAt: args.syncedAt,
      calendars: args.sourceUrls,
      eventCount: args.spots.length
    };

    if (existingMeta) {
      await ctx.db.patch(existingMeta._id, nextMeta);
    } else {
      await ctx.db.insert('syncMeta', nextMeta);
    }

    return {
      spotCount: args.spots.length,
      syncedAt: args.syncedAt
    };
  }
});
