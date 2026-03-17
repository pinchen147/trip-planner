import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createPlanId,
  sortPlanItems,
  sanitizePlannerByDate,
  compactPlannerByDate,
  hasPlannerEntries,
  parseEventTimeRange,
  getSuggestedPlanSlot,
  buildPlannerIcs,
  buildGoogleCalendarItemUrl,
} from './planner-helpers.ts';

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

describe('createPlanId', () => {
  it('generates unique ids with plan- prefix', () => {
    const id1 = createPlanId();
    const id2 = createPlanId();
    assert.ok(id1.startsWith('plan-'));
    assert.notEqual(id1, id2);
  });
});

describe('sortPlanItems', () => {
  it('sorts by startMinutes ascending', () => {
    const items = [
      makePlanItem({ id: 'a', startMinutes: 600 }),
      makePlanItem({ id: 'b', startMinutes: 480 }),
      makePlanItem({ id: 'c', startMinutes: 540 }),
    ];
    const sorted = sortPlanItems(items);
    assert.deepEqual(sorted.map((i) => i.id), ['b', 'c', 'a']);
  });

  it('does not mutate original array', () => {
    const items = [makePlanItem({ startMinutes: 600 }), makePlanItem({ startMinutes: 480 })];
    const sorted = sortPlanItems(items);
    assert.notEqual(sorted, items);
  });
});

describe('sanitizePlannerByDate', () => {
  it('normalizes date keys and clamps minutes', () => {
    const result = sanitizePlannerByDate({
      '2026-03-15': [
        { sourceKey: 'key1', title: 'Test', startMinutes: -10, endMinutes: 50 },
      ],
    });
    assert.ok(result['2026-03-15']);
    assert.equal(result['2026-03-15'].length, 1);
    assert.equal(result['2026-03-15'][0].startMinutes, 0);
  });

  it('filters out items without sourceKey', () => {
    const result = sanitizePlannerByDate({
      '2026-03-15': [
        { sourceKey: '', title: 'No key' },
        { sourceKey: 'valid', title: 'Has key' },
      ],
    });
    assert.equal(result['2026-03-15'].length, 1);
    assert.equal(result['2026-03-15'][0].sourceKey, 'valid');
  });
});

describe('compactPlannerByDate', () => {
  it('removes empty date entries', () => {
    const result = compactPlannerByDate({
      '2026-03-15': [makePlanItem()],
      '2026-03-16': [],
    });
    assert.ok(result['2026-03-15']);
    assert.equal(result['2026-03-16'], undefined);
  });
});

describe('hasPlannerEntries', () => {
  it('returns true when entries exist', () => {
    assert.ok(hasPlannerEntries({ '2026-03-15': [makePlanItem()] }));
  });

  it('returns false for empty planner', () => {
    assert.ok(!hasPlannerEntries({}));
    assert.ok(!hasPlannerEntries({ '2026-03-15': [] }));
  });
});

describe('parseEventTimeRange', () => {
  it('parses AM/PM time ranges', () => {
    const range = parseEventTimeRange('6:30 PM - 9:00 PM');
    assert.ok(range);
    assert.equal(range.startMinutes, 18 * 60 + 30);
    assert.equal(range.endMinutes, 21 * 60);
  });

  it('parses single time', () => {
    const range = parseEventTimeRange('7 PM');
    assert.ok(range);
    assert.equal(range.startMinutes, 19 * 60);
  });

  it('returns null for no time info', () => {
    assert.equal(parseEventTimeRange(''), null);
    assert.equal(parseEventTimeRange('No time here'), null);
  });
});

describe('getSuggestedPlanSlot', () => {
  it('uses preferred range when no overlap', () => {
    const slot = getSuggestedPlanSlot([], { startMinutes: 600, endMinutes: 660 }, 60);
    assert.equal(slot.startMinutes, 600);
    assert.equal(slot.endMinutes, 660);
  });

  it('finds next free slot when preferred overlaps', () => {
    const existing = [makePlanItem({ startMinutes: 540, endMinutes: 600 })];
    const slot = getSuggestedPlanSlot(existing, { startMinutes: 540, endMinutes: 600 }, 60);
    assert.ok(slot.startMinutes >= 600 || slot.endMinutes <= 540);
  });
});

describe('buildPlannerIcs', () => {
  it('generates valid ICS with timezone info', () => {
    const items = [makePlanItem()];
    const ics = buildPlannerIcs('2026-03-15', items, { timezone: 'America/New_York' });
    assert.ok(ics.includes('BEGIN:VCALENDAR'));
    assert.ok(ics.includes('END:VCALENDAR'));
    assert.ok(ics.includes('BEGIN:VEVENT'));
    assert.ok(ics.includes('DTSTART;TZID=America/New_York:'));
    assert.ok(ics.includes('X-WR-TIMEZONE:America/New_York'));
    assert.ok(ics.includes('SUMMARY:Test Event'));
  });

  it('defaults to UTC timezone with Z suffix', () => {
    const ics = buildPlannerIcs('2026-03-15', [makePlanItem()]);
    assert.ok(ics.includes('X-WR-TIMEZONE:UTC'));
    assert.ok(ics.includes('DTSTART:'), 'UTC should use DTSTART: not DTSTART;TZID=UTC:');
    assert.ok(ics.includes('Z'), 'UTC times should end with Z');
    assert.ok(!ics.includes('TZID=UTC'), 'UTC should not use TZID parameter');
  });
});

describe('buildGoogleCalendarItemUrl', () => {
  it('generates a valid Google Calendar URL with timezone', () => {
    const url = buildGoogleCalendarItemUrl({
      dateISO: '2026-03-15',
      item: makePlanItem(),
      baseLocationText: 'Home Base',
      timezone: 'Europe/London',
    });
    assert.ok(url.startsWith('https://calendar.google.com/calendar/render'));
    assert.ok(url.includes('ctz=Europe%2FLondon'));
    assert.ok(url.includes('Test+Event'));
  });
});
