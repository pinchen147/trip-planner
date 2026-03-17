import { getAuthUserId } from '@convex-dev/auth/server';
import type { MutationCtx, QueryCtx } from './_generated/server';

// --- DEV AUTH BYPASS (set CONVEX_DEV_BYPASS_AUTH=true in Convex dashboard env vars) ---
const DEV_BYPASS_AUTH = true;
const DEV_BYPASS_USER_ID = 'dev-bypass';
const DEV_BYPASS_EMAIL = 'pinchen147@gmail.com';
// --- END BYPASS ---

type ConvexCtx = MutationCtx | QueryCtx;

type AuthDeps = {
  getUserId?: (ctx: ConvexCtx) => Promise<unknown>;
};

export async function requireAuthenticatedUserId(ctx: ConvexCtx, deps: AuthDeps = {}) {
  if (DEV_BYPASS_AUTH) {
    return DEV_BYPASS_USER_ID;
  }
  const readUserId = deps.getUserId || getAuthUserId;
  const userId = await readUserId(ctx);
  if (!userId) {
    throw new Error('Authentication required.');
  }
  return String(userId);
}

export async function requireOwnerUserId(ctx: ConvexCtx, deps: AuthDeps = {}) {
  if (DEV_BYPASS_AUTH) {
    return DEV_BYPASS_USER_ID;
  }
  const userId = await requireAuthenticatedUserId(ctx, deps);
  const profile = await ctx.db
    .query('userProfiles')
    .withIndex('by_user_id', (q) => q.eq('userId', userId))
    .first();

  if (!profile || profile.role !== 'owner') {
    throw new Error('Owner role required.');
  }

  return userId;
}

