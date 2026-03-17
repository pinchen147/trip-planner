import { escapeHtml } from './helpers';

export function toKebabCase(value) {
  return String(value).replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

export function renderLucideIconNode(iconNode) {
  if (!Array.isArray(iconNode)) return '';
  return iconNode
    .map(([tag, attrs]) => {
      const attributes = Object.entries(attrs || {})
        .filter(([key]) => key !== 'key')
        .map(([key, value]) => `${toKebabCase(key)}="${escapeHtml(String(value))}"`)
        .join(' ');
      return `<${tag} ${attributes} />`;
    })
    .join('');
}

export function createLucidePinIcon(iconNode, color) {
  const iconSvg = renderLucideIconNode(iconNode);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="38" height="48" viewBox="0 0 38 48">
      <path d="M19 1C9.6 1 2 8.6 2 18c0 11.7 14.1 26.9 16.2 29.1a1.2 1.2 0 0 0 1.6 0C21.9 44.9 36 29.7 36 18 36 8.6 28.4 1 19 1z" fill="${color}" stroke="#ffffff" stroke-width="2" />
      <circle cx="19" cy="18" r="10" fill="rgba(255,255,255,0.16)" />
      <g transform="translate(7 6)" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        ${iconSvg}
      </g>
    </svg>
  `;

  const wrapper = document.createElement('div');
  wrapper.style.width = '38px';
  wrapper.style.height = '48px';
  wrapper.innerHTML = svg.trim();
  return wrapper;
}

export function createLucidePinIconWithLabel(iconNode, color, label) {
  const iconSvg = renderLucideIconNode(iconNode);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="38" height="48" viewBox="0 0 38 48">
      <path d="M19 1C9.6 1 2 8.6 2 18c0 11.7 14.1 26.9 16.2 29.1a1.2 1.2 0 0 0 1.6 0C21.9 44.9 36 29.7 36 18 36 8.6 28.4 1 19 1z" fill="${color}" stroke="#ffffff" stroke-width="2" />
      <circle cx="19" cy="18" r="10" fill="rgba(255,255,255,0.16)" />
      <g transform="translate(7 6)" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        ${iconSvg}
      </g>
    </svg>
  `;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;';
  const pinDiv = document.createElement('div');
  pinDiv.style.cssText = 'width:38px;height:48px;';
  pinDiv.innerHTML = svg.trim();
  wrapper.appendChild(pinDiv);

  if (label) {
    const badge = document.createElement('span');
    badge.textContent = label;
    badge.style.cssText = `margin-top:-6px;padding:1px 5px;font-size:10px;font-weight:700;line-height:14px;color:#fff;background:${color};border-radius:6px;white-space:nowrap;border:1.5px solid #fff;`;
    wrapper.appendChild(badge);
  }

  return wrapper;
}

export function toLatLngLiteral(position) {
  if (!position) return null;
  const latValue = typeof position.lat === 'function' ? position.lat() : position.lat;
  const lngValue = typeof position.lng === 'function' ? position.lng() : position.lng;
  const lat = Number(latValue);
  const lng = Number(lngValue);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function toCoordinateKey(position) {
  const point = toLatLngLiteral(position);
  if (!point) return '';
  return `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
}

export function createTravelTimeCacheKey({ travelMode, baseKey, destinationKey }) {
  return `${String(travelMode || '')};${baseKey};${destinationKey}`;
}

export function createRouteRequestCacheKey({ origin, destination, waypoints, travelMode }) {
  const originPoint = toLatLngLiteral(origin);
  const destinationPoint = toLatLngLiteral(destination);
  const waypointPoints = Array.isArray(waypoints)
    ? waypoints.map(toLatLngLiteral).filter(Boolean)
    : [];
  if (!originPoint || !destinationPoint) return '';
  const normalizePoint = (point) => `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
  return [
    String(travelMode || ''),
    normalizePoint(originPoint),
    normalizePoint(destinationPoint),
    waypointPoints.map(normalizePoint).join('|')
  ].join(';');
}

export function decodeEncodedPolyline(encoded) {
  if (!encoded || typeof encoded !== 'string') return [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  const coordinates = [];

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte = 0;
    do {
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    const latitudeDelta = result & 1 ? ~(result >> 1) : result >> 1;
    latitude += latitudeDelta;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    const longitudeDelta = result & 1 ? ~(result >> 1) : result >> 1;
    longitude += longitudeDelta;

    coordinates.push({ lat: latitude / 1e5, lng: longitude / 1e5 });
  }

  return coordinates;
}

export async function requestPlannedRoute({ origin, destination, waypoints, travelMode }) {
  const originPoint = toLatLngLiteral(origin);
  const destinationPoint = toLatLngLiteral(destination);
  if (!originPoint || !destinationPoint) {
    throw new Error('Set your home location before drawing a route.');
  }
  const waypointPoints = Array.isArray(waypoints)
    ? waypoints.map(toLatLngLiteral).filter(Boolean)
    : [];

  const response = await fetch('/api/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin: originPoint, destination: destinationPoint, waypoints: waypointPoints, travelMode })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `Route request failed: ${response.status}`);

  const path = decodeEncodedPolyline(payload.encodedPolyline || '');
  if (!path.length) throw new Error('No route geometry returned for this plan.');

  return {
    path,
    totalDistanceMeters: Number(payload.totalDistanceMeters) || 0,
    totalDurationSeconds: Number(payload.totalDurationSeconds) || 0
  };
}

const GMAPS_LOAD_TIMEOUT_MS = 15_000;
const GMAPS_POLL_INTERVAL_MS = 100;
const GMAPS_CALLBACK = '__gmapsReady';
const GMAPS_PROMISE_KEY = '__gmapsLoadPromise';

function waitForGoogleMaps(): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + GMAPS_LOAD_TIMEOUT_MS;
    const poll = () => {
      if (window.google?.maps) return resolve();
      if (Date.now() > deadline) return reject(new Error('Google Maps script load timed out.'));
      setTimeout(poll, GMAPS_POLL_INTERVAL_MS);
    };
    poll();
  });
}

export function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve();

  const w = window as any;
  if (w[GMAPS_PROMISE_KEY]) return w[GMAPS_PROMISE_KEY];

  // Script tag exists from HMR or prior render — wait for it, don't inject another
  if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
    w[GMAPS_PROMISE_KEY] = waitForGoogleMaps();
    return w[GMAPS_PROMISE_KEY];
  }

  w[GMAPS_PROMISE_KEY] = new Promise<void>((resolve, reject) => {
    let settled = false;
    const succeed = () => { if (!settled) { settled = true; delete w[GMAPS_CALLBACK]; resolve(); } };
    const fail = (msg: string) => {
      if (!settled) { settled = true; delete w[GMAPS_CALLBACK]; delete w[GMAPS_PROMISE_KEY]; reject(new Error(msg)); }
    };

    w[GMAPS_CALLBACK] = succeed;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places,visualization&callback=${GMAPS_CALLBACK}`;
    script.async = true;
    script.onerror = () => fail('Google Maps script failed to load.');
    document.head.appendChild(script);
    setTimeout(() => fail('Google Maps script load timed out.'), GMAPS_LOAD_TIMEOUT_MS);
  });
  return w[GMAPS_PROMISE_KEY];
}

export function buildInfoWindowAddButton(plannerAction) {
  if (!plannerAction) return '';
  if (!plannerAction.enabled || !plannerAction.id) {
    return `<p style="margin:6px 0;color:#6a6a6a;font-size:12px;font-family:'JetBrains Mono',monospace;">Pick a planner date first to add this stop.</p>`;
  }
  return `
    <button id="${escapeHtml(plannerAction.id)}" type="button"
      style="margin:6px 0 8px;padding:6px 10px;border:1px solid rgba(0,255,136,0.25);background:rgba(0,255,136,0.06);color:#00FF88;border-radius:0;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;cursor:pointer;text-transform:uppercase;letter-spacing:0.05em;">
      ${escapeHtml(plannerAction.label || 'Add to selected date')}
    </button>
  `;
}
