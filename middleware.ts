import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect
} from '@convex-dev/auth/nextjs/server';

const isSignInRoute = createRouteMatcher(['/signin']);
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/trips(.*)',
]);

// Legacy tab routes (bare /map, /planning, etc.) that need redirecting
const LEGACY_TABS = new Set(['map', 'calendar', 'planning', 'spots', 'sources', 'config']);

// --- TEMPORARY AUTH BYPASS ---
const DEV_BYPASS_AUTH = true;
// --- END BYPASS ---

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const { pathname, searchParams } = request.nextUrl;

  // Redirect /trips/{tripId} (no tab) → /trips/{tripId}/planning
  const tripNoTab = pathname.match(/^\/trips\/([^/]+)\/?$/);
  if (tripNoTab) {
    return nextjsMiddlewareRedirect(request, `/trips/${tripNoTab[1]}/planning`);
  }

  // Legacy redirect: /planning?trip=xxx → /trips/xxx/planning (and same for other tabs)
  const firstSegment = pathname.split('/')[1] || '';
  if (LEGACY_TABS.has(firstSegment)) {
    const tripId = searchParams.get('trip');
    const targetTab = firstSegment === 'spots' ? 'sources' : firstSegment;
    if (tripId) {
      return nextjsMiddlewareRedirect(request, `/trips/${tripId}/${targetTab}`);
    }
    // Bare /map, /planning, etc. without trip → dashboard
    return nextjsMiddlewareRedirect(request, '/dashboard');
  }

  if (DEV_BYPASS_AUTH) {
    if (isSignInRoute(request)) {
      return nextjsMiddlewareRedirect(request, '/dashboard');
    }
    return;
  }

  // The convexAuthNextjsMiddleware wrapper exchanges ?code= params before this
  // callback runs. After exchange, it redirects to the same URL without ?code=.
  // If the wrapper didn't consume the code (e.g. invalid), let the page handle it.
  const isAuthenticated = await convexAuth.isAuthenticated();

  if (isSignInRoute(request) && isAuthenticated) {
    return nextjsMiddlewareRedirect(request, '/dashboard');
  }

  if (isProtectedRoute(request) && !isAuthenticated) {
    // Don't redirect auth callbacks — the wrapper needs to process them
    if (searchParams.has('code')) {
      return;
    }
    return nextjsMiddlewareRedirect(request, '/signin');
  }
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/(api|trpc)(.*)']
};
