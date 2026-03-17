/**
 * Cross-cutting integrity tests.
 *
 * Every test calls a real function with real inputs and asserts real outputs.
 * Source scanning is used ONLY for values that are not exported (consent key,
 * auth bypass flag). Linting concerns (@ts-nocheck, import extensions, branding
 * strings, file existence) are deliberately excluded — those belong in
 * tsconfig/eslint/CI, not in a test file.
 *
 * Run:  node --test lib/integrity.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

// ─── imports ────────────────────────────────────────────────────────────────

const {
  buildPlannerIcs,
  buildGoogleCalendarItemUrl,
  buildGoogleCalendarStopUrls,
  sanitizePlannerByDate,
  parseEventTimeRange,
  getSuggestedPlanSlot,
} = await import('./planner-helpers.ts');

const { getAllCityEntries, getCityEntry } = await import('./city-registry.ts');
const { getCrimeCityConfig, getAllCrimeCitySlugs } = await import('./crime-cities.ts');

// ─── factory ────────────────────────────────────────────────────────────────

function makePlanItem(overrides = {}) {
  return {
    id: 'plan-test1',
    kind: 'event',
    sourceKey: 'https://example.com/event',
    title: 'Test Event',
    locationText: '123 Main St',
    link: 'https://example.com',
    tag: 'eat',
    startMinutes: 540,
    endMinutes: 600,
    ...overrides,
  };
}

function readSource(relPath) {
  return readFileSync(path.resolve(relPath), 'utf8');
}

/** Extract all lines matching a prefix from an ICS string. */
function icsLines(ics, prefix) {
  return ics.split('\r\n').filter((l) => l.startsWith(prefix));
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. ICS RFC 5545 COMPLIANCE
// ═══════════════════════════════════════════════════════════════════════════════

describe('ICS: RFC 5545 compliance', () => {
  it('UTC uses DTSTART:...Z, never TZID=UTC', () => {
    const ics = buildPlannerIcs('2026-03-15', [makePlanItem()]);
    assert.ok(!ics.includes('TZID=UTC'));
    for (const line of icsLines(ics, 'DTSTART:')) {
      assert.ok(line.endsWith('Z'), `UTC DTSTART must end with Z: ${line}`);
    }
  });

  it('non-UTC uses DTSTART;TZID=<tz>: without trailing Z', () => {
    const ics = buildPlannerIcs('2026-03-15', [makePlanItem()], { timezone: 'America/New_York' });
    assert.ok(ics.includes('DTSTART;TZID=America/New_York:'));
    assert.ok(ics.includes('DTEND;TZID=America/New_York:'));
    for (const line of icsLines(ics, 'DTSTART;')) {
      assert.ok(!line.endsWith('Z'));
    }
  });

  it('hour values never reach 24', () => {
    const item = makePlanItem({ startMinutes: 1380, endMinutes: 1440 });
    const ics = buildPlannerIcs('2026-03-15', [item]);
    const hours = [...ics.matchAll(/T(\d{2})\d{4}/g)].map((m) => Number(m[1]));
    for (const h of hours) assert.ok(h <= 23, `hour ${h} > 23`);
  });

  it('escapes commas, semicolons, backslashes, and newlines in text fields', () => {
    const item = makePlanItem({ title: 'A, B; C\\D\nE' });
    const ics = buildPlannerIcs('2026-03-15', [item]);
    assert.ok(ics.includes('\\,'), 'comma not escaped');
    assert.ok(ics.includes('\\;'), 'semicolon not escaped');
    assert.ok(ics.includes('\\\\'), 'backslash not escaped');
    assert.ok(ics.includes('\\n'), 'newline not escaped');
  });

  it('empty plan produces valid calendar with no VEVENTs', () => {
    const ics = buildPlannerIcs('2026-03-15', []);
    assert.ok(ics.includes('BEGIN:VCALENDAR'));
    assert.ok(ics.includes('END:VCALENDAR'));
    assert.ok(!ics.includes('BEGIN:VEVENT'));
  });

  it('includes VERSION, PRODID, CALSCALE', () => {
    const ics = buildPlannerIcs('2026-03-15', [makePlanItem()]);
    assert.ok(ics.includes('VERSION:2.0'));
    assert.ok(ics.includes('PRODID:'));
    assert.ok(ics.includes('CALSCALE:GREGORIAN'));
  });

  it('uses CRLF line endings exclusively', () => {
    const ics = buildPlannerIcs('2026-03-15', [makePlanItem()]);
    assert.ok(ics.includes('\r\n'));
    assert.ok(!ics.replace(/\r\n/g, '').includes('\n'), 'bare LF found');
  });

  it('each VEVENT has a unique UID', () => {
    const items = [
      makePlanItem({ id: 'a', startMinutes: 540 }),
      makePlanItem({ id: 'b', startMinutes: 660 }),
    ];
    const ics = buildPlannerIcs('2026-03-15', items);
    const uids = [...ics.matchAll(/UID:([^\r]+)/g)].map((m) => m[1]);
    assert.equal(uids.length, 2);
    assert.notEqual(uids[0], uids[1], 'UIDs must be unique per event');
  });

  it('DTSTAMP is in UTC Z format', () => {
    const ics = buildPlannerIcs('2026-03-15', [makePlanItem()]);
    const stamps = icsLines(ics, 'DTSTAMP:');
    assert.ok(stamps.length > 0);
    for (const s of stamps) assert.ok(s.endsWith('Z'), `DTSTAMP must be UTC: ${s}`);
  });

  it('falls back to cityName for LOCATION when item has no locationText', () => {
    const item = makePlanItem({ locationText: '' });
    const ics = buildPlannerIcs('2026-03-15', [item], { cityName: 'Tokyo' });
    assert.ok(ics.includes('LOCATION:Tokyo'));
  });

  it('preserves unicode in titles', () => {
    const item = makePlanItem({ title: 'Caf\u00e9 \u2615' });
    const ics = buildPlannerIcs('2026-03-15', [item]);
    assert.ok(ics.includes('Caf\u00e9'), 'unicode lost in SUMMARY');
  });

  it('sorts events by startMinutes in output', () => {
    const items = [
      makePlanItem({ id: 'c', title: 'Late', startMinutes: 1200 }),
      makePlanItem({ id: 'a', title: 'Early', startMinutes: 60 }),
      makePlanItem({ id: 'b', title: 'Mid', startMinutes: 720 }),
    ];
    const ics = buildPlannerIcs('2026-03-15', items);
    const titles = [...ics.matchAll(/SUMMARY:([^\r]+)/g)].map((m) => m[1]);
    assert.deepEqual(titles, ['Early', 'Mid', 'Late']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. GOOGLE CALENDAR URLS
// ═══════════════════════════════════════════════════════════════════════════════

describe('GCAL: URL correctness', () => {
  it('includes ctz timezone parameter', () => {
    const url = buildGoogleCalendarItemUrl({
      dateISO: '2026-03-15',
      item: makePlanItem(),
      baseLocationText: 'Hotel',
      timezone: 'Asia/Tokyo',
    });
    assert.ok(url.includes('ctz=Asia%2FTokyo'));
  });

  it('defaults ctz to UTC', () => {
    const url = buildGoogleCalendarItemUrl({
      dateISO: '2026-03-15',
      item: makePlanItem(),
      baseLocationText: '',
    });
    assert.ok(url.includes('ctz=UTC'));
  });

  it('includes action=TEMPLATE', () => {
    const url = buildGoogleCalendarItemUrl({
      dateISO: '2026-03-15',
      item: makePlanItem(),
      baseLocationText: '',
    });
    assert.ok(url.includes('action=TEMPLATE'));
  });

  it('batch URLs returns one per item with correct timezone', () => {
    const urls = buildGoogleCalendarStopUrls({
      dateISO: '2026-03-15',
      planItems: [makePlanItem({ id: 'a' }), makePlanItem({ id: 'b', startMinutes: 660 })],
      baseLocationText: 'Hotel',
      timezone: 'Europe/Paris',
    });
    assert.equal(urls.length, 2);
    for (const u of urls) {
      assert.ok(u.startsWith('https://calendar.google.com/'));
      assert.ok(u.includes('ctz=Europe%2FParis'));
    }
  });

  it('batch URLs returns empty array for empty input', () => {
    const urls = buildGoogleCalendarStopUrls({
      dateISO: '2026-03-15',
      planItems: [],
      baseLocationText: '',
    });
    assert.deepEqual(urls, []);
  });

  it('URL-encodes special characters in title', () => {
    const url = buildGoogleCalendarItemUrl({
      dateISO: '2026-03-15',
      item: makePlanItem({ title: 'Dinner & Dancing' }),
      baseLocationText: '',
    });
    assert.ok(url.includes('Dinner'));
    assert.ok(!url.includes(' & '), 'ampersand must be encoded');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. PLANNER EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe('PLANNER: edge cases', () => {
  it('midnight (1440 min) clamps to valid hour in ICS output', () => {
    const item = makePlanItem({ startMinutes: 1380, endMinutes: 1440 });
    const ics = buildPlannerIcs('2026-03-15', [item]);
    const hours = [...ics.matchAll(/T(\d{2})\d{4}/g)].map((m) => Number(m[1]));
    for (const h of hours) assert.ok(h <= 23, `hour ${h} > 23`);
  });

  it('sanitizePlannerByDate drops non-date keys', () => {
    const result = sanitizePlannerByDate({
      'not-a-date': [{ sourceKey: 'k', title: 'T', startMinutes: 0, endMinutes: 60 }],
    });
    assert.equal(result['not-a-date'], undefined);
  });

  it('sanitizePlannerByDate assigns IDs to items missing them', () => {
    const result = sanitizePlannerByDate({
      '2026-03-15': [{ sourceKey: 'k', title: 'T', startMinutes: 0, endMinutes: 60 }],
    });
    const items = result['2026-03-15'];
    assert.ok(items.length === 1);
    assert.ok(items[0].id.startsWith('plan-'), `auto-ID should start with plan-: ${items[0].id}`);
  });

  it('parseEventTimeRange: 12:00 AM = 0, 12:00 PM = 720', () => {
    const am = parseEventTimeRange('12:00 AM');
    assert.ok(am);
    assert.equal(am.startMinutes, 0);

    const pm = parseEventTimeRange('12:00 PM');
    assert.ok(pm);
    assert.equal(pm.startMinutes, 720);
  });

  it('getSuggestedPlanSlot returns valid range even when day is full', () => {
    const items = Array.from({ length: 48 }, (_, i) =>
      makePlanItem({ id: `i${i}`, startMinutes: i * 30, endMinutes: (i + 1) * 30 })
    );
    const slot = getSuggestedPlanSlot(items, null, 30);
    assert.ok(slot.startMinutes >= 0);
    assert.ok(slot.endMinutes <= 1440);
    assert.ok(slot.endMinutes > slot.startMinutes);
  });

  it('unicode titles survive ICS round-trip', () => {
    const item = makePlanItem({ title: '\u2615 Caf\u00e9 \u{1F1EF}\u{1F1F5}' });
    const ics = buildPlannerIcs('2026-03-15', [item]);
    assert.ok(ics.includes('\u2615'), 'coffee emoji lost');
    assert.ok(ics.includes('Caf\u00e9'), 'accented char lost');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. CITY REGISTRY CONTRACTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('CITY REGISTRY: behavioral contracts', () => {
  const entries = getAllCityEntries();

  it('has at least 7 registered cities', () => {
    assert.ok(entries.length >= 7, `only ${entries.length} cities`);
  });

  it('every entry has a valid IANA timezone', () => {
    for (const e of entries) {
      assert.ok(e.timezone.includes('/'),
        `${e.slug}: timezone "${e.timezone}" is not IANA format`);
    }
  });

  it('every entry has finite lat/lng in mapCenter', () => {
    for (const e of entries) {
      assert.ok(Number.isFinite(e.mapCenter.lat), `${e.slug}: lat not finite`);
      assert.ok(Number.isFinite(e.mapCenter.lng), `${e.slug}: lng not finite`);
    }
  });

  it('getCityEntry returns undefined for unknown slug', () => {
    assert.equal(getCityEntry('atlantis'), undefined);
  });

  it('every crime city has required config fields', () => {
    for (const slug of getAllCrimeCitySlugs()) {
      const config = getCrimeCityConfig(slug);
      assert.ok(config, `no config for crime city "${slug}"`);
      assert.ok(config.host, `${slug}: missing host`);
      assert.ok(config.datasetId, `${slug}: missing datasetId`);
      assert.ok(config.fields.latitude, `${slug}: missing fields.latitude`);
      assert.ok(config.fields.longitude, `${slug}: missing fields.longitude`);
      assert.ok(config.fields.datetime, `${slug}: missing fields.datetime`);
      assert.ok(config.fields.category, `${slug}: missing fields.category`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. STRUCTURAL INVARIANTS (unexported values only)
// ═══════════════════════════════════════════════════════════════════════════════

describe('STRUCTURAL: cross-file invariants', () => {
  it('CookieConsent and ConsentAnalytics share the same CONSENT_KEY', () => {
    const consentSrc = readSource('components/CookieConsent.tsx');
    const analyticsSrc = readSource('components/ConsentAnalytics.tsx');
    const keyA = consentSrc.match(/CONSENT_KEY\s*=\s*'([^']+)'/);
    const keyB = analyticsSrc.match(/CONSENT_KEY\s*=\s*'([^']+)'/);
    assert.ok(keyA, 'CookieConsent must define CONSENT_KEY');
    assert.ok(keyB, 'ConsentAnalytics must define CONSENT_KEY');
    assert.equal(keyA[1], keyB[1], `key mismatch: "${keyA[1]}" vs "${keyB[1]}"`);
  });

  it('DEV_BYPASS_AUTH is declared in all auth boundary files', () => {
    const files = ['middleware.ts', 'lib/request-auth.ts', 'convex/authz.ts'];
    for (const f of files) {
      assert.ok(readSource(f).includes('DEV_BYPASS_AUTH'), `${f} missing DEV_BYPASS_AUTH`);
    }
  });

  it('GDPR: privacy page and data endpoints exist', () => {
    assert.ok(existsSync('app/privacy/page.tsx'), 'missing privacy page');
    assert.ok(existsSync('app/api/me/data/route.ts'), 'missing data export endpoint');
    assert.ok(existsSync('app/api/me/delete/route.ts'), 'missing deletion endpoint');
  });
});
