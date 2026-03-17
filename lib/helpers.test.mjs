import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizePlaceTag,
  normalizeAddressKey,
  normalizeDateKey,
  formatDate,
  formatDateWeekday,
  formatDateDayMonth,
  formatMonthYear,
  formatDayOfMonth,
  formatDistance,
  formatDurationFromSeconds,
  formatMinuteLabel,
  formatHour,
  toISODate,
  toMonthISO,
  addMonthsToMonthISO,
  buildISODateRange,
  buildCalendarGridDates,
  daysFromNow,
  clampMinutes,
  snapMinutes,
  escapeHtml,
  truncate,
} from './helpers.ts';

describe('normalizePlaceTag', () => {
  it('normalizes common aliases', () => {
    assert.equal(normalizePlaceTag('bars'), 'bar');
    assert.equal(normalizePlaceTag('bar'), 'bar');
    assert.equal(normalizePlaceTag('cafe'), 'cafes');
    assert.equal(normalizePlaceTag('restaurant'), 'eat');
    assert.equal(normalizePlaceTag('food'), 'eat');
    assert.equal(normalizePlaceTag('nightlife'), 'go out');
    assert.equal(normalizePlaceTag('shop'), 'shops');
  });

  it('defaults to cafes for unknown tags', () => {
    assert.equal(normalizePlaceTag('unknown'), 'cafes');
    assert.equal(normalizePlaceTag(''), 'cafes');
  });
});

describe('normalizeAddressKey', () => {
  it('lowercases and collapses whitespace', () => {
    assert.equal(normalizeAddressKey('  123  Main  St  '), '123 main st');
  });

  it('handles empty/null input', () => {
    assert.equal(normalizeAddressKey(''), '');
    assert.equal(normalizeAddressKey(null), '');
  });
});

describe('normalizeDateKey', () => {
  it('extracts YYYY-MM-DD from ISO strings', () => {
    assert.equal(normalizeDateKey('2026-03-15T10:00:00Z'), '2026-03-15');
    assert.equal(normalizeDateKey('2026-03-15'), '2026-03-15');
  });

  it('returns empty for invalid input', () => {
    assert.equal(normalizeDateKey(''), '');
    assert.equal(normalizeDateKey('not-a-date'), '');
  });
});

describe('formatDate', () => {
  it('formats a date with timezone', () => {
    const result = formatDate('2026-03-15', 'America/New_York');
    assert.ok(result.includes('Mar'), `Expected Mar in "${result}"`);
  });

  it('defaults to UTC and returns a non-empty formatted string', () => {
    const result = formatDate('2026-03-15');
    assert.ok(result.length > 0);
    assert.notEqual(result, '2026-03-15');
  });

  it('returns input for invalid dates', () => {
    assert.equal(formatDate('invalid'), 'invalid');
  });
});

describe('formatDistance', () => {
  it('formats in miles by default', () => {
    assert.equal(formatDistance(1609.344), '1.0 mi');
    assert.equal(formatDistance(16093.44), '10 mi');
  });

  it('formats in kilometers when specified', () => {
    assert.equal(formatDistance(1000, 'km'), '1.0 km');
    assert.equal(formatDistance(15000, 'km'), '15 km');
  });

  it('returns n/a for invalid values', () => {
    assert.equal(formatDistance(0), 'n/a');
    assert.equal(formatDistance(-100), 'n/a');
    assert.equal(formatDistance(NaN), 'n/a');
  });
});

describe('formatDurationFromSeconds', () => {
  it('formats minutes only', () => {
    assert.equal(formatDurationFromSeconds(300), '5m');
  });

  it('formats hours and minutes', () => {
    assert.equal(formatDurationFromSeconds(3660), '1h 1m');
  });

  it('returns n/a for invalid values', () => {
    assert.equal(formatDurationFromSeconds(0), 'n/a');
    assert.equal(formatDurationFromSeconds(-1), 'n/a');
  });
});

describe('formatMinuteLabel', () => {
  it('formats in 12-hour by default', () => {
    assert.equal(formatMinuteLabel(0), '12:00 AM');
    assert.equal(formatMinuteLabel(720), '12:00 PM');
    assert.equal(formatMinuteLabel(810), '1:30 PM');
  });

  it('formats in 24-hour when specified', () => {
    assert.equal(formatMinuteLabel(0, true), '00:00');
    assert.equal(formatMinuteLabel(720, true), '12:00');
    assert.equal(formatMinuteLabel(810, true), '13:30');
  });
});

describe('formatHour', () => {
  it('formats in 12-hour by default', () => {
    assert.equal(formatHour(0), '12 AM');
    assert.equal(formatHour(13), '1 PM');
  });

  it('formats in 24-hour when specified', () => {
    assert.equal(formatHour(0, true), '00:00');
    assert.equal(formatHour(13, true), '13:00');
    assert.equal(formatHour(9, true), '09:00');
  });
});

describe('toISODate', () => {
  it('converts Date objects', () => {
    assert.equal(toISODate(new Date('2026-03-15T00:00:00Z')), '2026-03-15');
  });

  it('returns empty for invalid input', () => {
    assert.equal(toISODate('garbage'), '');
  });
});

describe('toMonthISO', () => {
  it('extracts YYYY-MM-01', () => {
    assert.equal(toMonthISO('2026-03-15'), '2026-03-01');
  });

  it('returns empty for short strings', () => {
    assert.equal(toMonthISO('abc'), '');
  });
});

describe('addMonthsToMonthISO', () => {
  it('adds months forward', () => {
    assert.equal(addMonthsToMonthISO('2026-03-01', 1), '2026-04-01');
    assert.equal(addMonthsToMonthISO('2026-12-01', 1), '2027-01-01');
  });

  it('subtracts months backward', () => {
    assert.equal(addMonthsToMonthISO('2026-03-01', -1), '2026-02-01');
  });
});

describe('buildISODateRange', () => {
  it('generates sequential dates', () => {
    const range = buildISODateRange('2026-03-10', '2026-03-12');
    assert.deepEqual(range, ['2026-03-10', '2026-03-11', '2026-03-12']);
  });

  it('returns empty for reversed range', () => {
    assert.deepEqual(buildISODateRange('2026-03-12', '2026-03-10'), []);
  });

  it('caps at 90 days', () => {
    const range = buildISODateRange('2026-01-01', '2026-12-31');
    assert.equal(range.length, 90);
  });
});

describe('buildCalendarGridDates', () => {
  it('returns 42 dates for a valid month', () => {
    const dates = buildCalendarGridDates('2026-03-01');
    assert.equal(dates.length, 42);
    assert.ok(dates[0].startsWith('2026-'));
  });

  it('returns empty for invalid input', () => {
    assert.deepEqual(buildCalendarGridDates('invalid'), []);
  });
});

describe('clampMinutes', () => {
  it('clamps within bounds', () => {
    assert.equal(clampMinutes(100, 0, 1440), 100);
    assert.equal(clampMinutes(-10, 0, 1440), 0);
    assert.equal(clampMinutes(2000, 0, 1440), 1440);
  });

  it('returns min for NaN', () => {
    assert.equal(clampMinutes(NaN, 0, 1440), 0);
  });
});

describe('snapMinutes', () => {
  it('snaps to 15-minute intervals', () => {
    assert.equal(snapMinutes(7), 0);
    assert.equal(snapMinutes(8), 15);
    assert.equal(snapMinutes(22), 15);
    assert.equal(snapMinutes(23), 30);
  });
});

describe('escapeHtml', () => {
  it('escapes HTML entities', () => {
    assert.equal(escapeHtml('<script>alert("hi")</script>'), '&lt;script&gt;alert(&quot;hi&quot;)&lt;/script&gt;');
    assert.equal(escapeHtml("it's"), "it&#39;s");
  });
});

describe('truncate', () => {
  it('truncates long strings', () => {
    assert.equal(truncate('hello world', 8), 'hello...');
  });

  it('returns short strings unchanged', () => {
    assert.equal(truncate('hi', 10), 'hi');
  });
});
