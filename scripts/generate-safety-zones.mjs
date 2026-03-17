#!/usr/bin/env node
/**
 * One-time script: generate avoid/safe zone overlays for supported crime cities.
 *
 * For each city:
 *   1. Fetch recent crime incidents from Socrata (30-day window).
 *   2. Group by neighborhood and score by incident count + violent-crime ratio.
 *   3. Fetch or compute neighborhood boundary polygons.
 *   4. Classify top neighborhoods as "avoid", bottom as "safe".
 *   5. Simplify polygons to ~12-16 points.
 *   6. Output JSON matching the static-places.json shape.
 *
 * Usage:  node scripts/generate-safety-zones.mjs
 */

import { writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const CRIME_HOURS = 30 * 24; // 30 days
const CRIME_LIMIT = 50000;
const AVOID_PERCENTILE = 0.75;
const SAFE_PERCENTILE = 0.25;

const VIOLENT_KEYWORDS = [
  'homicide', 'murder', 'rape', 'assault', 'robbery', 'weapons', 'arson',
  'kidnapping', 'sex offense', 'sex crime', 'human trafficking', 'battery',
  'manslaughter', 'shooting',
];

function isViolent(category) {
  const c = (category || '').toLowerCase();
  return VIOLENT_KEYWORDS.some((k) => c.includes(k));
}

// Douglas-Peucker line simplification
function perpendicularDistance(point, lineStart, lineEnd) {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag === 0) return Math.sqrt((point[0] - lineStart[0]) ** 2 + (point[1] - lineStart[1]) ** 2);
  const u = ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / (mag * mag);
  const ix = lineStart[0] + u * dx;
  const iy = lineStart[1] + u * dy;
  return Math.sqrt((point[0] - ix) ** 2 + (point[1] - iy) ** 2);
}

function douglasPeucker(points, epsilon) {
  if (points.length <= 2) return points;
  let maxDist = 0, maxIdx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), epsilon);
    const right = douglasPeucker(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [points[0], points[points.length - 1]];
}

function simplifyPolygon(coords, targetPoints = 14) {
  if (coords.length <= targetPoints) return coords;
  let lo = 0, hi = 0.01;
  // Find epsilon that produces approximately targetPoints
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const simplified = douglasPeucker(coords, mid);
    if (simplified.length > targetPoints) lo = mid;
    else hi = mid;
  }
  const result = douglasPeucker(coords, hi);
  return result.length >= 4 ? result : coords.slice(0, Math.min(targetPoints, coords.length));
}

function polygonCentroid(coords) {
  let latSum = 0, lngSum = 0;
  for (const [lng, lat] of coords) { latSum += lat; lngSum += lng; }
  return { lat: +(latSum / coords.length).toFixed(4), lng: +(lngSum / coords.length).toFixed(4) };
}

function coordsToLatLng(coords, targetPoints = 14) {
  const simplified = simplifyPolygon(coords, targetPoints);
  return simplified.map(([lng, lat]) => ({ lat: +lat.toFixed(4), lng: +lng.toFixed(4) }));
}

// Convex hull (Graham scan) for cities without boundary datasets
function convexHull(points) {
  if (points.length < 3) return points;
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (const p of sorted.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

// ----- City configs -----
const CITIES = [
  {
    slug: 'san-francisco',
    cityName: 'San Francisco',
    crimeHost: 'data.sfgov.org',
    crimeDataset: 'wg3w-h783',
    crimeFields: { datetime: 'incident_datetime', category: 'incident_category', neighborhood: 'analysis_neighborhood', lat: 'latitude', lng: 'longitude' },
    dateFilterField: 'incident_date',
    excludedCategories: ['Non-Criminal', 'Case Closure', 'Lost Property', 'Courtesy Report', 'Recovered Vehicle'],
    boundaryDataset: 'j2bu-swwd',
    boundaryNameField: 'nhood',
    boundaryGeomField: 'the_geom',
  },
  {
    slug: 'chicago',
    cityName: 'Chicago',
    crimeHost: 'data.cityofchicago.org',
    crimeDataset: 'ijzp-q8t2',
    crimeFields: { datetime: 'date', category: 'primary_type', neighborhood: 'location_description', lat: 'latitude', lng: 'longitude' },
    dateFilterField: 'date',
    excludedCategories: ['NON-CRIMINAL', 'NON - CRIMINAL', 'NON-CRIMINAL (SUBJECT SPECIFIED)'],
    boundaryDataset: 'igwz-8jzy',
    boundaryNameField: 'community',
    boundaryGeomField: 'the_geom',
    // Chicago crime uses location_description not community area. We need to aggregate
    // by the boundary's community field instead. We'll use a special mapping.
    neighborhoodFromBoundary: true,
  },
  {
    slug: 'los-angeles',
    cityName: 'Los Angeles',
    crimeHost: 'data.lacity.org',
    crimeDataset: '2nrs-mtv8',
    crimeFields: { datetime: 'date_occ', category: 'crm_cd_desc', neighborhood: 'area_name', lat: 'lat', lng: 'lon' },
    dateFilterField: 'date_occ',
    excludedCategories: [],
    boundaryDataset: null, // use convex hull
    // LA data ends Dec 2024; use explicit since date
    sinceOverride: '2024-11-01T00:00:00.000',
    // 21 LAPD divisions is coarse; use generous thresholds to get more zones
    avoidPct: 0.55,
    safePct: 0.45,
  },
  {
    slug: 'new-york',
    cityName: 'New York City',
    crimeHost: 'data.cityofnewyork.us',
    crimeDataset: '5uac-w243',
    crimeFields: { datetime: 'cmplnt_fr_dt', category: 'ofns_desc', neighborhood: 'boro_nm', lat: 'latitude', lng: 'longitude' },
    dateFilterField: 'cmplnt_fr_dt',
    excludedCategories: [],
    boundaryDataset: null, // NYC only has 5 boroughs for neighborhood; too coarse
  },
  {
    slug: 'seattle',
    cityName: 'Seattle',
    crimeHost: 'data.seattle.gov',
    crimeDataset: 'tazs-3rd5',
    crimeFields: { datetime: 'offense_date', category: 'offense_sub_category', neighborhood: 'beat', lat: 'latitude', lng: 'longitude' },
    dateFilterField: 'offense_date',
    excludedCategories: ['999', 'NOT_A_CRIME'],
    boundaryDataset: null, // use convex hull
  },
];

function sqlLiteral(v) { return `'${String(v).replace(/'/g, "''")}'`; }

async function fetchCrimeIncidents(city) {
  const sinceDateISO = city.sinceOverride || `${new Date(Date.now() - CRIME_HOURS * 3600 * 1000).toISOString().slice(0, 10)}T00:00:00.000`;
  const f = city.crimeFields;

  const whereParts = [
    `${city.dateFilterField} >= ${sqlLiteral(sinceDateISO)}`,
    `${f.lat} IS NOT NULL`,
    `${f.lng} IS NOT NULL`,
  ];
  if (city.excludedCategories.length > 0) {
    whereParts.push(`${f.category} NOT IN (${city.excludedCategories.map(sqlLiteral).join(',')})`);
  }

  const url = new URL(`https://${city.crimeHost}/resource/${city.crimeDataset}.json`);
  url.searchParams.set('$select', [f.datetime, f.category, f.neighborhood, f.lat, f.lng].filter(Boolean).join(','));
  url.searchParams.set('$where', whereParts.join(' AND '));
  url.searchParams.set('$order', `${f.datetime} DESC`);
  url.searchParams.set('$limit', String(CRIME_LIMIT));

  console.log(`  Fetching incidents from ${city.crimeHost}...`);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Upstream ${city.cityName} failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const rows = await res.json();
  if (!Array.isArray(rows)) return [];

  return rows.map((r) => {
    const lat = Number(r[f.lat]);
    const lng = Number(r[f.lng]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) < 1 || Math.abs(lng) < 1) return null; // sentinel/REDACTED values
    const hood = String(r[f.neighborhood] || '').trim();
    if (!hood || hood === '-' || hood === 'REDACTED') return null;
    return { lat, lng, category: String(r[f.category] || ''), neighborhood: hood };
  }).filter(Boolean);
}

async function fetchBoundaries(city) {
  if (!city.boundaryDataset) return null;
  const url = `https://${city.crimeHost}/resource/${city.boundaryDataset}.json?$select=${city.boundaryNameField},${city.boundaryGeomField}&$limit=200`;
  console.log(`  Fetching boundaries from ${city.crimeHost}/${city.boundaryDataset}...`);
  const res = await fetch(url);
  if (!res.ok) return null;
  const rows = await res.json();
  if (!Array.isArray(rows)) return null;

  const map = new Map();
  for (const r of rows) {
    const name = String(r[city.boundaryNameField] || '').trim();
    const geom = r[city.boundaryGeomField];
    if (!name || !geom?.coordinates) continue;
    // MultiPolygon: take the largest ring
    let ring;
    if (geom.type === 'MultiPolygon') {
      ring = geom.coordinates.reduce((best, poly) =>
        poly[0].length > (best?.length || 0) ? poly[0] : best, []);
    } else if (geom.type === 'Polygon') {
      ring = geom.coordinates[0];
    }
    if (ring && ring.length >= 3) map.set(name.toUpperCase(), ring);
  }
  return map;
}

function scoreNeighborhoods(incidents) {
  const hoods = new Map();
  for (const inc of incidents) {
    const key = inc.neighborhood.toUpperCase();
    if (!hoods.has(key)) hoods.set(key, { name: inc.neighborhood, total: 0, violent: 0, coords: [] });
    const h = hoods.get(key);
    h.total++;
    if (isViolent(inc.category)) h.violent++;
    h.coords.push([inc.lng, inc.lat]);
  }

  // Compute composite score: normalized total + 2x normalized violent ratio
  const entries = [...hoods.values()].filter((h) => h.total >= 5);
  if (entries.length === 0) return [];
  const maxTotal = Math.max(...entries.map((h) => h.total));
  for (const h of entries) {
    const totalNorm = h.total / maxTotal;
    const violentRatio = h.total > 0 ? h.violent / h.total : 0;
    h.score = totalNorm * 0.6 + violentRatio * 0.4;
  }
  entries.sort((a, b) => b.score - a.score);
  return entries;
}

function classifyZones(scored, avoidPct = AVOID_PERCENTILE, safePct = SAFE_PERCENTILE) {
  if (scored.length === 0) return { avoid: [], safe: [] };
  const avoidCutoff = scored[Math.floor(scored.length * (1 - avoidPct))]?.score || 0;
  const safeCutoff = scored[Math.floor(scored.length * (1 - safePct))]?.score || Infinity;

  const avoid = scored.filter((h) => h.score >= avoidCutoff);
  const safe = scored.filter((h) => h.score <= safeCutoff);
  return { avoid, safe };
}

function riskLevel(score, maxScore) {
  const pct = score / maxScore;
  if (pct >= 0.9) return 'extreme';
  if (pct >= 0.7) return 'high';
  if (pct >= 0.5) return 'medium-high';
  return 'medium';
}

function safetyLevel(score, minScore, maxScore) {
  const pct = maxScore > minScore ? (score - minScore) / (maxScore - minScore) : 0;
  if (pct <= 0.15) return 'very-high';
  if (pct <= 0.35) return 'high';
  return 'moderate';
}

function topCrimeTypes(incidents, neighborhood, limit = 3) {
  const key = neighborhood.toUpperCase();
  const counts = new Map();
  for (const inc of incidents) {
    if (inc.neighborhood.toUpperCase() !== key) continue;
    const cat = inc.category;
    counts.set(cat, (counts.get(cat) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([cat]) => cat)
    .join(', ');
}

function buildPlace(hood, tag, city, boundary, incidents) {
  const center = boundary ? polygonCentroid(boundary) : polygonCentroid(hood.coords);
  const boundaryLatLng = boundary
    ? coordsToLatLng(boundary, 14)
    : coordsToLatLng(convexHull(hood.coords), 12);

  if (boundaryLatLng.length < 3) return null;

  const crimeTypes = topCrimeTypes(incidents, hood.name);
  const violentPct = hood.total > 0 ? Math.round((hood.violent / hood.total) * 100) : 0;

  const base = {
    id: `${tag}-${city.slug}-${hood.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: hood.name,
    tag,
    location: `${hood.name}, ${city.cityName}`,
    mapLink: `https://www.google.com/maps/search/?api=1&query=${center.lat},${center.lng}`,
    cornerLink: '',
    curatorComment: '',
    lat: center.lat,
    lng: center.lng,
    boundary: boundaryLatLng,
  };

  if (tag === 'avoid') {
    return {
      ...base,
      risk: riskLevel(hood.score, 1),
      crimeTypes,
      description: `${hood.total.toLocaleString()} incidents (${violentPct}% violent) in last 30 days.`,
      details: '',
    };
  }
  return {
    ...base,
    safetyLevel: safetyLevel(hood.score, 0, 1),
    crimeTypes: crimeTypes || '',
    safetyHighlights: `Lower crime density than city average.`,
    description: `${hood.total.toLocaleString()} incidents in last 30 days.`,
    details: '',
  };
}

async function generateForCity(city) {
  console.log(`\n=== ${city.cityName} (${city.slug}) ===`);

  const incidents = await fetchCrimeIncidents(city);
  console.log(`  ${incidents.length} incidents fetched.`);
  if (incidents.length < 20) {
    console.log(`  Skipping: too few incidents.`);
    return [];
  }

  const scored = scoreNeighborhoods(incidents);
  console.log(`  ${scored.length} neighborhoods scored.`);

  const { avoid, safe } = classifyZones(scored, city.avoidPct, city.safePct);
  console.log(`  ${avoid.length} avoid zones, ${safe.length} safe zones.`);

  let boundaries = await fetchBoundaries(city);
  if (boundaries) {
    console.log(`  ${boundaries.size} boundary polygons loaded.`);
  } else {
    console.log(`  No boundary dataset; using convex hulls.`);
  }

  const places = [];

  for (const hood of avoid) {
    const bKey = hood.name.toUpperCase();
    const boundary = boundaries?.get(bKey) || null;
    const place = buildPlace(hood, 'avoid', city, boundary, incidents);
    if (place) places.push(place);
  }

  for (const hood of safe) {
    const bKey = hood.name.toUpperCase();
    const boundary = boundaries?.get(bKey) || null;
    const place = buildPlace(hood, 'safe', city, boundary, incidents);
    if (place) places.push(place);
  }

  console.log(`  ${places.length} zone entries generated.`);
  return places;
}

async function main() {
  // Skip SF (already has curated data) and NYC (only 5 boroughs, too coarse)
  const citiesToRun = CITIES.filter((c) => c.slug !== 'new-york');

  const allPlaces = [];
  for (const city of citiesToRun) {
    try {
      const places = await generateForCity(city);
      allPlaces.push(...places);
    } catch (err) {
      console.error(`  ERROR for ${city.cityName}:`, err.message);
    }
  }

  // Read existing static-places, remove old auto-generated entries, merge
  const staticPath = path.join(process.cwd(), 'data', 'static-places.json');
  let existing = [];
  try {
    existing = JSON.parse(await readFile(staticPath, 'utf-8'));
  } catch { /* no file */ }

  // Keep SF entries (manually curated), remove auto-generated for other cities
  const manual = existing.filter((p) => {
    const id = p.id || '';
    // Keep if it's an SF entry (no city suffix other than SF-specific ids)
    if (id.startsWith('avoid-') || id.startsWith('safe-')) {
      // Keep SF manual entries (they don't have city slug in id)
      const hasSlug = CITIES.some((c) => c.slug !== 'san-francisco' && id.includes(c.slug));
      return !hasSlug;
    }
    return true;
  });

  const merged = [...manual, ...allPlaces.filter((p) => !p.id.includes('san-francisco'))];
  await writeFile(staticPath, JSON.stringify(merged, null, 2) + '\n');

  console.log(`\n--- Done: ${allPlaces.length} zones generated, ${merged.length} total entries in static-places.json ---`);
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
