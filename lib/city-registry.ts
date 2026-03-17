export type CityEntry = {
  slug: string;
  name: string;
  timezone: string;
  locale: string;
  mapCenter: { lat: number; lng: number };
  mapBounds: { north: number; south: number; east: number; west: number };
  crimeAdapterId: string;
};

const CITIES: Record<string, CityEntry> = {
  'san-francisco': {
    slug: 'san-francisco',
    name: 'San Francisco',
    timezone: 'America/Los_Angeles',
    locale: 'en-US',
    mapCenter: { lat: 37.7749, lng: -122.4194 },
    mapBounds: { north: 37.85, south: 37.68, east: -122.33, west: -122.55 },
    crimeAdapterId: 'sf-open-data',
  },
  'new-york': {
    slug: 'new-york',
    name: 'New York',
    timezone: 'America/New_York',
    locale: 'en-US',
    mapCenter: { lat: 40.7128, lng: -74.006 },
    mapBounds: { north: 40.92, south: 40.49, east: -73.7, west: -74.26 },
    crimeAdapterId: 'nypd-open-data',
  },
  'los-angeles': {
    slug: 'los-angeles',
    name: 'Los Angeles',
    timezone: 'America/Los_Angeles',
    locale: 'en-US',
    mapCenter: { lat: 34.0522, lng: -118.2437 },
    mapBounds: { north: 34.34, south: 33.7, east: -118.0, west: -118.67 },
    crimeAdapterId: 'lapd-open-data',
  },
  'chicago': {
    slug: 'chicago',
    name: 'Chicago',
    timezone: 'America/Chicago',
    locale: 'en-US',
    mapCenter: { lat: 41.8781, lng: -87.6298 },
    mapBounds: { north: 42.02, south: 41.64, east: -87.52, west: -87.94 },
    crimeAdapterId: 'chicago-open-data',
  },
  'london': {
    slug: 'london',
    name: 'London',
    timezone: 'Europe/London',
    locale: 'en-GB',
    mapCenter: { lat: 51.5074, lng: -0.1278 },
    mapBounds: { north: 51.69, south: 51.28, east: 0.34, west: -0.51 },
    crimeAdapterId: 'uk-police',
  },
  'seattle': {
    slug: 'seattle',
    name: 'Seattle',
    timezone: 'America/Los_Angeles',
    locale: 'en-US',
    mapCenter: { lat: 47.6062, lng: -122.3321 },
    mapBounds: { north: 47.73, south: 47.49, east: -122.22, west: -122.44 },
    crimeAdapterId: 'seattle-open-data',
  },
  'cincinnati': {
    slug: 'cincinnati',
    name: 'Cincinnati',
    timezone: 'America/New_York',
    locale: 'en-US',
    mapCenter: { lat: 39.1031, lng: -84.512 },
    mapBounds: { north: 39.21, south: 39.05, east: -84.37, west: -84.62 },
    crimeAdapterId: 'cincinnati-open-data',
  },
  'dallas': {
    slug: 'dallas',
    name: 'Dallas',
    timezone: 'America/Chicago',
    locale: 'en-US',
    mapCenter: { lat: 32.7767, lng: -96.797 },
    mapBounds: { north: 33.02, south: 32.62, east: -96.55, west: -97.0 },
    crimeAdapterId: 'dallas-open-data',
  },
  'tokyo': {
    slug: 'tokyo',
    name: 'Tokyo',
    timezone: 'Asia/Tokyo',
    locale: 'ja-JP',
    mapCenter: { lat: 35.6762, lng: 139.6503 },
    mapBounds: { north: 35.82, south: 35.5, east: 139.92, west: 139.56 },
    crimeAdapterId: '',
  },
  'paris': {
    slug: 'paris',
    name: 'Paris',
    timezone: 'Europe/Paris',
    locale: 'fr-FR',
    mapCenter: { lat: 48.8566, lng: 2.3522 },
    mapBounds: { north: 48.92, south: 48.8, east: 2.47, west: 2.22 },
    crimeAdapterId: '',
  },
  'barcelona': {
    slug: 'barcelona',
    name: 'Barcelona',
    timezone: 'Europe/Madrid',
    locale: 'es-ES',
    mapCenter: { lat: 41.3874, lng: 2.1686 },
    mapBounds: { north: 41.47, south: 41.32, east: 2.23, west: 2.07 },
    crimeAdapterId: '',
  },
};

export function getCityEntry(slug: string): CityEntry | undefined {
  return CITIES[slug];
}

export function getAllCityEntries(): CityEntry[] {
  return Object.values(CITIES);
}

export function getCrimeAdapterIdForSlug(slug: string): string {
  const entry = CITIES[slug] || CITIES[stripCountrySuffix(slug)];
  return entry?.crimeAdapterId || '';
}

/**
 * Strip a trailing 2-letter country code suffix (e.g. "san-francisco-us" → "san-francisco").
 * Returns the input unchanged if it doesn't match the pattern.
 */
function stripCountrySuffix(slug: string): string {
  const match = slug.match(/^(.+)-[a-z]{2}$/);
  return match ? match[1] : slug;
}

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
