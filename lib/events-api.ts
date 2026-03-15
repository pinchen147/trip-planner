import { loadEventsPayload as loadEventsPayloadDefault } from './events.ts';
import { runWithAuthenticatedClient as runWithAuthenticatedClientDefault } from './api-guards.ts';

type EventsApiDeps = {
  runWithAuthenticatedClient?: typeof runWithAuthenticatedClientDefault;
  loadEventsPayload?: typeof loadEventsPayloadDefault;
};

export function createGetEventsHandler(deps: EventsApiDeps = {}) {
  const runWithAuthenticatedClient = deps.runWithAuthenticatedClient || runWithAuthenticatedClientDefault;
  const loadEventsPayload = deps.loadEventsPayload || loadEventsPayloadDefault;

  return async function GET(request: Request) {
    return runWithAuthenticatedClient(async () => {
      const url = new URL(request.url);
      const cityId = url.searchParams.get('cityId') || '';
      const payload = await loadEventsPayload(cityId);
      return Response.json(payload);
    });
  };
}
