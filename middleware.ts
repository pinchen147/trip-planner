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
const LEGACY_TABS = new Set(['map', 'calendar', 'planning', 'spots', 'config']);

// --- TEMPORARY AUTH BYPASS ---
const DEV_BYPASS_AUTH = true;
// --- END BYPASS ---

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const { pathname, searchParams } = request.nextUrl;

  // Legacy redirect: /planning?trip=xxx → /trips/xxx/planning (and same for other tabs)
  const firstSegment = pathname.split('/')[1] || '';
  if (LEGACY_TABS.has(firstSegment)) {
    const tripId = searchParams.get('trip');
    if (tripId) {
      return nextjsMiddlewareRedirect(request, `/trips/${tripId}/${firstSegment}`);
    }
    // Bare /map, /planning, etc. without trip → dashboard
    return nextjsMiddlewareRedirect(request, '/dashboard');
  }

  if (DEV_BYPASS_AUTH) {
    // Skip all auth redirects in dev
    if (isSignInRoute(request)) {
      return nextjsMiddlewareRedirect(request, '/dashboard');
    }
    return;
  }

  const isAuthenticated = await convexAuth.isAuthenticated();

  if (isSignInRoute(request) && isAuthenticated) {
    return nextjsMiddlewareRedirect(request, '/dashboard');
  }

  if (isProtectedRoute(request) && !isAuthenticated) {
    return nextjsMiddlewareRedirect(request, '/signin');
  }
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/(api|trpc)(.*)']
};
