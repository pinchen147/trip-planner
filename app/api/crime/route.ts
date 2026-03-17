import { consumeRateLimit, getRequestRateLimitIp } from '@/lib/security';
import {
  getCrimeCityConfig,
  getDefaultCrimeCitySlug,
  type CrimeCityFieldMap,
} from '@/lib/crime-cities';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_HOURS = 24;
const MAX_HOURS = 7 * 24;
const DEFAULT_LIMIT = 4000;
const MAX_LIMIT = 10000;

type CrimeBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

function clampInteger(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function clampFloat(value: string | null, min: number, max: number) {
  const parsed = Number.parseFloat(String(value || ''));
  if (!Number.isFinite(parsed)) return null;
  return Math.max(min, Math.min(max, parsed));
}

function sqlStringLiteral(value: string) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function parseCrimeBounds(searchParams: URLSearchParams): CrimeBounds | null {
  const south = clampFloat(searchParams.get('south'), -90, 90);
  const west = clampFloat(searchParams.get('west'), -180, 180);
  const north = clampFloat(searchParams.get('north'), -90, 90);
  const east = clampFloat(searchParams.get('east'), -180, 180);
  if ([south, west, north, east].some((v) => !Number.isFinite(v))) return null;
  if ((south as number) >= (north as number)) return null;
  if ((west as number) >= (east as number)) return null;
  return {
    south: Number(south),
    west: Number(west),
    north: Number(north),
    east: Number(east)
  };
}

function buildIncidentWhereClause(
  fields: CrimeCityFieldMap,
  dateFilterField: string,
  excludedCategories: string[],
  sinceDateISO: string,
  bounds: CrimeBounds | null
) {
  const clauses = [
    `${dateFilterField} >= ${sqlStringLiteral(sinceDateISO)}`,
  ];
  if (!isNestedField(fields.latitude)) {
    clauses.push(`${fields.latitude} IS NOT NULL`);
    clauses.push(`${fields.longitude} IS NOT NULL`);
  }
  if (excludedCategories.length > 0) {
    const excluded = excludedCategories.map(sqlStringLiteral).join(', ');
    clauses.push(`${fields.category} NOT IN (${excluded})`);
  }
  if (bounds && !isNestedField(fields.latitude)) {
    clauses.push(`${fields.latitude} >= ${bounds.south} AND ${fields.latitude} <= ${bounds.north}`);
    clauses.push(`${fields.longitude} >= ${bounds.west} AND ${fields.longitude} <= ${bounds.east}`);
  }
  return clauses.join(' AND ');
}

function resolveField(row: any, path: string): unknown {
  if (!path) return undefined;
  if (!path.includes('.')) return row?.[path];
  return path.split('.').reduce((obj, key) => obj?.[key], row);
}

function selectFieldRoot(field: string): string {
  const dot = field.indexOf('.');
  return dot === -1 ? field : field.slice(0, dot);
}

function isNestedField(field: string): boolean {
  return field.includes('.');
}

function normalizeIncident(row: any, fields: CrimeCityFieldMap, sinceComparableISO: string) {
  const lat = Number(resolveField(row, fields.latitude));
  const lng = Number(resolveField(row, fields.longitude));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const incidentDatetime = String(resolveField(row, fields.datetime) || '');
  if (incidentDatetime && incidentDatetime < sinceComparableISO) return null;
  return {
    lat,
    lng,
    incidentDatetime,
    incidentCategory: String(resolveField(row, fields.category) || ''),
    incidentSubcategory: fields.subcategory ? String(resolveField(row, fields.subcategory) || '') : '',
    neighborhood: fields.neighborhood ? String(resolveField(row, fields.neighborhood) || '') : ''
  };
}

export async function GET(request: Request) {
  const rateLimit = consumeRateLimit({
    key: `api:crime:${getRequestRateLimitIp(request)}`,
    limit: 30,
    windowMs: 60_000
  });
  if (!rateLimit.ok) {
    return Response.json(
      {
        error: 'Too many crime data requests. Please retry shortly.'
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  const url = new URL(request.url);
  const citySlug = url.searchParams.get('city') || getDefaultCrimeCitySlug();
  const cityConfig = getCrimeCityConfig(citySlug);
  if (!cityConfig) {
    return Response.json(
      { error: `Unsupported city: ${citySlug}` },
      { status: 400 }
    );
  }

  const { fields } = cityConfig;
  const hours = clampInteger(url.searchParams.get('hours'), DEFAULT_HOURS, 1, MAX_HOURS);
  const limit = clampInteger(url.searchParams.get('limit'), DEFAULT_LIMIT, 200, MAX_LIMIT);
  const bounds = parseCrimeBounds(url.searchParams);
  const sinceISO = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const sinceComparableISO = sinceISO.replace('Z', '');
  const sinceDateISO = `${sinceISO.slice(0, 10)}T00:00:00.000`;
  const whereClause = buildIncidentWhereClause(
    fields,
    cityConfig.dateFilterField,
    cityConfig.excludedCategories,
    sinceDateISO,
    bounds
  );

  const datasetUrl = `https://${cityConfig.host}/resource/${cityConfig.datasetId}.json`;
  const queryUrl = new URL(datasetUrl);
  const selectFieldNames = new Set(
    [fields.datetime, fields.category, fields.subcategory, fields.neighborhood, fields.latitude, fields.longitude]
      .filter(Boolean)
      .map(selectFieldRoot)
  );
  const selectFields = [...selectFieldNames].join(',');
  queryUrl.searchParams.set('$select', selectFields);
  queryUrl.searchParams.set('$where', whereClause);
  queryUrl.searchParams.set('$order', `${fields.datetime} DESC`);
  queryUrl.searchParams.set('$limit', String(limit));

  const requestHeaders: Record<string, string> = {};
  const appToken = process.env[cityConfig.appTokenEnvVar];
  if (appToken) {
    requestHeaders['X-App-Token'] = appToken;
  }

  const upstream = await fetch(queryUrl.toString(), {
    headers: requestHeaders,
    next: { revalidate: 60 }
  });

  if (!upstream.ok) {
    const body = await upstream.text().catch(() => '');
    return Response.json(
      {
        error: `Upstream ${cityConfig.label} open data request failed (${upstream.status}).`,
        details: body.slice(0, 300)
      },
      { status: 502 }
    );
  }

  const rows = await upstream.json().catch(() => []);
  const incidents = Array.isArray(rows)
    ? rows.map((row: any) => normalizeIncident(row, fields, sinceComparableISO)).filter(Boolean)
    : [];

  return Response.json(
    {
      incidents,
      hours,
      limit,
      count: incidents.length,
      source: {
        provider: cityConfig.providerName,
        datasetId: cityConfig.datasetId,
        datasetUrl: `${cityConfig.portalBaseUrl}/d/${cityConfig.datasetId}`
      },
      bounds,
      generatedAt: new Date().toISOString()
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    }
  );
}
