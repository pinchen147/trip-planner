import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAuthenticatedUserId, requireOwnerUserId } from './authz';

const cityValidator = v.object({
  _id: v.id('cities'),
  slug: v.string(),
  name: v.string(),
  timezone: v.string(),
  locale: v.string(),
  mapCenter: v.object({ lat: v.number(), lng: v.number() }),
  mapBounds: v.object({
    north: v.number(),
    south: v.number(),
    east: v.number(),
    west: v.number(),
  }),
  crimeAdapterId: v.string(),
  isSeeded: v.boolean(),
  createdByUserId: v.string(),
  createdAt: v.string(),
  updatedAt: v.string(),
});

export const listCities = query({
  args: {},
  returns: v.array(cityValidator),
  handler: async (ctx) => {
    await requireAuthenticatedUserId(ctx);
    const rows = await ctx.db.query('cities').collect();
    return rows
      .map(({ _creationTime, ...row }) => row)
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const getCity = query({
  args: { slug: v.string() },
  returns: v.union(v.null(), cityValidator),
  handler: async (ctx, args) => {
    await requireAuthenticatedUserId(ctx);
    const row = await ctx.db
      .query('cities')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first();
    if (!row) return null;
    const { _creationTime, ...city } = row;
    return city;
  },
});

export const createCity = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    timezone: v.string(),
    locale: v.string(),
    mapCenter: v.object({ lat: v.number(), lng: v.number() }),
    mapBounds: v.object({
      north: v.number(),
      south: v.number(),
      east: v.number(),
      west: v.number(),
    }),
    crimeAdapterId: v.optional(v.string()),
  },
  returns: cityValidator,
  handler: async (ctx, args) => {
    const userId = await requireOwnerUserId(ctx);
    const now = new Date().toISOString();

    const existing = await ctx.db
      .query('cities')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first();
    if (existing) {
      throw new Error(`City with slug "${args.slug}" already exists.`);
    }

    const _id = await ctx.db.insert('cities', {
      slug: args.slug,
      name: args.name,
      timezone: args.timezone,
      locale: args.locale,
      mapCenter: args.mapCenter,
      mapBounds: args.mapBounds,
      crimeAdapterId: args.crimeAdapterId ?? '',
      isSeeded: false,
      createdByUserId: userId,
      createdAt: now,
      updatedAt: now,
    });

    return {
      _id,
      slug: args.slug,
      name: args.name,
      timezone: args.timezone,
      locale: args.locale,
      mapCenter: args.mapCenter,
      mapBounds: args.mapBounds,
      crimeAdapterId: args.crimeAdapterId ?? '',
      isSeeded: false,
      createdByUserId: userId,
      createdAt: now,
      updatedAt: now,
    };
  },
});

export const ensureCity = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    timezone: v.string(),
    locale: v.string(),
    mapCenter: v.object({ lat: v.number(), lng: v.number() }),
    mapBounds: v.object({
      north: v.number(),
      south: v.number(),
      east: v.number(),
      west: v.number(),
    }),
    crimeAdapterId: v.optional(v.string()),
  },
  returns: cityValidator,
  handler: async (ctx, args) => {
    const userId = await requireAuthenticatedUserId(ctx);
    const existing = await ctx.db
      .query('cities')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first();
    if (existing) {
      const { _creationTime, ...city } = existing;
      return city;
    }
    const now = new Date().toISOString();
    const _id = await ctx.db.insert('cities', {
      slug: args.slug,
      name: args.name,
      timezone: args.timezone,
      locale: args.locale,
      mapCenter: args.mapCenter,
      mapBounds: args.mapBounds,
      crimeAdapterId: args.crimeAdapterId ?? '',
      isSeeded: false,
      createdByUserId: userId,
      createdAt: now,
      updatedAt: now,
    });
    return {
      _id,
      slug: args.slug,
      name: args.name,
      timezone: args.timezone,
      locale: args.locale,
      mapCenter: args.mapCenter,
      mapBounds: args.mapBounds,
      crimeAdapterId: args.crimeAdapterId ?? '',
      isSeeded: false,
      createdByUserId: userId,
      createdAt: now,
      updatedAt: now,
    };
  },
});

export const updateCity = mutation({
  args: {
    slug: v.string(),
    name: v.optional(v.string()),
    timezone: v.optional(v.string()),
    locale: v.optional(v.string()),
    mapCenter: v.optional(v.object({ lat: v.number(), lng: v.number() })),
    mapBounds: v.optional(
      v.object({
        north: v.number(),
        south: v.number(),
        east: v.number(),
        west: v.number(),
      })
    ),
    crimeAdapterId: v.optional(v.string()),
  },
  returns: v.union(v.null(), cityValidator),
  handler: async (ctx, args) => {
    await requireOwnerUserId(ctx);

    const existing = await ctx.db
      .query('cities')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first();
    if (!existing) return null;

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.timezone !== undefined) updates.timezone = args.timezone;
    if (args.locale !== undefined) updates.locale = args.locale;
    if (args.mapCenter !== undefined) updates.mapCenter = args.mapCenter;
    if (args.mapBounds !== undefined) updates.mapBounds = args.mapBounds;
    if (args.crimeAdapterId !== undefined) updates.crimeAdapterId = args.crimeAdapterId;

    await ctx.db.patch(existing._id, updates);

    const updated = await ctx.db.get(existing._id);
    if (!updated) return null;
    const { _creationTime, ...city } = updated;
    return city;
  },
});
