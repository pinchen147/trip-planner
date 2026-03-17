import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';

// --- TEMPORARY AUTH BYPASS ---
const DEV_BYPASS_AUTH = true;
const DEV_BYPASS_EMAIL = 'pinchen147@gmail.com';
// --- END BYPASS ---

function getConvexUrl() {
  return process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL || '';
}

function createConvexClient() {
  const convexUrl = getConvexUrl();
  if (!convexUrl) {
    return null;
  }
  return new ConvexHttpClient(convexUrl);
}

function createConvexClientWithToken(token: string) {
  const client = createConvexClient();
  if (client && token) {
    client.setAuth(token);
  }
  return client;
}

function unauthenticatedResponse() {
  return Response.json(
    {
      error: 'Sign in required.',
      needsAuth: true
    },
    { status: 401 }
  );
}

export async function requireAuthenticatedClient() {
  if (DEV_BYPASS_AUTH) {
    const client = createConvexClient();
    if (!client) {
      return {
        client: null,
        deniedResponse: Response.json({ error: 'CONVEX_URL is missing.' }, { status: 503 }),
        profile: null,
      };
    }
    return {
      client,
      deniedResponse: null,
      profile: { email: DEV_BYPASS_EMAIL, role: 'owner', userId: 'dev-bypass' },
    };
  }

  const token = await convexAuthNextjsToken();
  if (!token) {
    return {
      client: null,
      deniedResponse: unauthenticatedResponse(),
      profile: null
    };
  }

  const client = createConvexClientWithToken(token);
  if (!client) {
    return {
      client: null,
      deniedResponse: Response.json(
        {
          error: 'CONVEX_URL is missing. Configure Convex to continue.'
        },
        { status: 503 }
      ),
      profile: null
    };
  }

  try {
    const profile =
      await client.query('appUsers:getCurrentUserProfile' as any, {}) ||
      await client.mutation('appUsers:ensureCurrentUserProfile' as any, {});
    return {
      client,
      deniedResponse: null,
      profile
    };
  } catch (error) {
    return {
      client: null,
      deniedResponse: Response.json(
        {
          error: error instanceof Error ? error.message : 'Authentication failed.',
          needsAuth: true
        },
        { status: 401 }
      ),
      profile: null
    };
  }
}

export async function requireOwnerClient() {
  if (DEV_BYPASS_AUTH) {
    return requireAuthenticatedClient();
  }

  const auth = await requireAuthenticatedClient();
  if (auth.deniedResponse) {
    return auth;
  }

  if (auth.profile?.role !== 'owner') {
    return {
      client: null,
      deniedResponse: Response.json(
        {
          error: 'Owner role required.',
          needsRole: 'owner'
        },
        { status: 403 }
      ),
      profile: auth.profile
    };
  }

  return auth;
}
