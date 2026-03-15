import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  ...authTables,

  // ── New tables ──────────────────────────────────────────────

  cities: defineTable({
    slug: v.string(),
    name: v.string(),
    timezone: v.string(),
    locale: v.string(),
    mapCenter: v.object({
      lat: v.number(),
      lng: v.number(),
    }),
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
  }).index('by_slug', ['slug']),

  trips: defineTable({
    userId: v.string(),
    urlId: v.optional(v.string()),
    name: v.string(),
    legs: v.array(
      v.object({
        cityId: v.string(),
        startDate: v.string(),
        endDate: v.string(),
      })
    ),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index('by_user', ['userId'])
    .index('by_url_id', ['urlId']),

  // ── Legacy (kept for reference, will be removed later) ─────

  plannerState: defineTable({
    key: v.string(),
    plannerByDate: v.record(
      v.string(),
      v.array(
        v.object({
          id: v.string(),
          kind: v.union(v.literal('event'), v.literal('place')),
          sourceKey: v.string(),
          title: v.string(),
          locationText: v.string(),
          link: v.string(),
          tag: v.string(),
          startMinutes: v.number(),
          endMinutes: v.number()
        })
      )
    ),
    updatedAt: v.string()
  }).index('by_key', ['key']),

  // ── Modified tables ────────────────────────────────────────

  plannerEntries: defineTable({
    tripId: v.id('trips'),
    cityId: v.string(),
    roomCode: v.string(),
    ownerUserId: v.string(),
    dateISO: v.string(),
    itemId: v.string(),
    kind: v.union(v.literal('event'), v.literal('place')),
    sourceKey: v.string(),
    title: v.string(),
    locationText: v.string(),
    link: v.string(),
    tag: v.string(),
    startMinutes: v.number(),
    endMinutes: v.number(),
    updatedAt: v.string()
  })
    .index('by_trip_room', ['tripId', 'roomCode'])
    .index('by_trip_room_owner', ['tripId', 'roomCode', 'ownerUserId'])
    .index('by_trip_room_owner_date', ['tripId', 'roomCode', 'ownerUserId', 'dateISO'])
    .index('by_trip_room_date', ['tripId', 'roomCode', 'dateISO']),

  pairRooms: defineTable({
    tripId: v.id('trips'),
    roomCode: v.string(),
    createdByUserId: v.string(),
    createdAt: v.string(),
    updatedAt: v.string()
  }).index('by_trip_room', ['tripId', 'roomCode']),

  pairMembers: defineTable({
    tripId: v.id('trips'),
    roomCode: v.string(),
    userId: v.string(),
    joinedAt: v.string()
  })
    .index('by_trip_room', ['tripId', 'roomCode'])
    .index('by_trip_room_user', ['tripId', 'roomCode', 'userId'])
    .index('by_user', ['userId']),

  userProfiles: defineTable({
    userId: v.string(),
    role: v.union(v.literal('owner'), v.literal('member')),
    email: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string()
  })
    .index('by_user_id', ['userId'])
    .index('by_role', ['role']),

  routeCache: defineTable({
    key: v.string(),
    encodedPolyline: v.string(),
    totalDistanceMeters: v.number(),
    totalDurationSeconds: v.number(),
    updatedAt: v.string()
  }).index('by_key', ['key']),

  events: defineTable({
    cityId: v.string(),
    id: v.string(),
    name: v.string(),
    description: v.string(),
    eventUrl: v.string(),
    startDateTimeText: v.string(),
    startDateISO: v.string(),
    locationText: v.string(),
    address: v.string(),
    googleMapsUrl: v.string(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    sourceId: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    confidence: v.optional(v.number()),
    missedSyncCount: v.optional(v.number()),
    isDeleted: v.optional(v.boolean()),
    lastSeenAt: v.optional(v.string()),
    updatedAt: v.optional(v.string())
  })
    .index('by_city', ['cityId'])
    .index('by_city_event_url', ['cityId', 'eventUrl'])
    .index('by_city_source', ['cityId', 'sourceId']),

  spots: defineTable({
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
  })
    .index('by_city', ['cityId'])
    .index('by_city_spot_id', ['cityId', 'id'])
    .index('by_city_source', ['cityId', 'sourceId']),

  sources: defineTable({
    cityId: v.string(),
    sourceType: v.union(v.literal('event'), v.literal('spot')),
    url: v.string(),
    label: v.string(),
    status: v.union(v.literal('active'), v.literal('paused')),
    createdAt: v.string(),
    updatedAt: v.string(),
    lastSyncedAt: v.optional(v.string()),
    lastError: v.optional(v.string()),
    rssStateJson: v.optional(v.string())
  })
    .index('by_city_type_status', ['cityId', 'sourceType', 'status'])
    .index('by_city_url', ['cityId', 'url']),

  geocodeCache: defineTable({
    addressKey: v.string(),
    addressText: v.string(),
    lat: v.number(),
    lng: v.number(),
    updatedAt: v.string()
  }).index('by_address_key', ['addressKey']),

  syncMeta: defineTable({
    key: v.string(),
    syncedAt: v.string(),
    calendars: v.array(v.string()),
    eventCount: v.number()
  }).index('by_key', ['key']),

  tripConfig: defineTable({
    tripId: v.id('trips'),
    timezone: v.string(),
    tripStart: v.string(),
    tripEnd: v.string(),
    baseLocation: v.optional(v.string()),
    updatedAt: v.string()
  }).index('by_trip', ['tripId'])
});
