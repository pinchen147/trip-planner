import type { PlanItem, PlanItemKind, MinuteRange } from './types.ts';
import {
  MINUTES_IN_DAY,
  MIN_PLAN_BLOCK_MINUTES,
  clampMinutes,
  snapMinutes,
  normalizeDateKey,
  normalizePlaceTag,
  formatMinuteLabel,
  formatDate,
  toDateOnlyISO
} from './helpers.ts';

export const PLAN_SNAP_MINUTES = 15;
export const PLAN_HOUR_HEIGHT = 50;
export const PLAN_MINUTE_HEIGHT = PLAN_HOUR_HEIGHT / 60;
export const PLAN_STORAGE_KEY = 'trip-day-plans-v2';
export const GEOCODE_CACHE_STORAGE_KEY = 'trip-geocode-cache-v2';
export const MAX_ROUTE_STOPS = 8;

export function createPlanId(): string {
  return `plan-${Math.random().toString(36).slice(2, 9)}`;
}

export function sortPlanItems(items: PlanItem[]): PlanItem[] {
  return [...items].sort((left, right) => left.startMinutes - right.startMinutes);
}

export function sanitizePlannerByDate(value: Record<string, any[]>): Record<string, PlanItem[]> {
  const result: Record<string, PlanItem[]> = {};
  for (const [dateISO, items] of Object.entries(value || {})) {
    const normalizedDateISO = normalizeDateKey(dateISO);
    if (!Array.isArray(items) || !normalizedDateISO) continue;

    const cleanedItems: PlanItem[] = items
      .filter((item) => item && typeof item === 'object')
      .map((item) => {
        const startMinutes = clampMinutes(Number(item.startMinutes), 0, MINUTES_IN_DAY);
        const endMinutes = clampMinutes(Number(item.endMinutes), startMinutes + MIN_PLAN_BLOCK_MINUTES, MINUTES_IN_DAY);
        const kind: PlanItemKind = item.kind === 'event' ? 'event' : 'place';
        return {
          id: typeof item.id === 'string' && item.id ? item.id : createPlanId(),
          kind,
          sourceKey: String(item.sourceKey || ''),
          title: String(item.title || 'Untitled stop'),
          locationText: String(item.locationText || ''),
          link: String(item.link || ''),
          tag: normalizePlaceTag(item.tag),
          startMinutes,
          endMinutes
        };
      })
      .filter((item) => item.sourceKey);

    const previousItems = Array.isArray(result[normalizedDateISO]) ? result[normalizedDateISO] : [];
    result[normalizedDateISO] = sortPlanItems([...previousItems, ...cleanedItems]);
  }
  return result;
}

export function compactPlannerByDate(value: Record<string, PlanItem[]>): Record<string, PlanItem[]> {
  const compacted: Record<string, PlanItem[]> = {};
  for (const [dateISO, items] of Object.entries(value || {})) {
    if (!Array.isArray(items) || items.length === 0) continue;
    compacted[dateISO] = items;
  }
  return compacted;
}

export function hasPlannerEntries(value: Record<string, PlanItem[]>): boolean {
  return Object.values(value || {}).some((items) => Array.isArray(items) && items.length > 0);
}

export function parseEventTimeRange(value: string): MinuteRange | null {
  if (!value || typeof value !== 'string') return null;
  const matches = [...value.matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/gi)];
  if (!matches.length) return null;

  const start = toMinuteOfDay(matches[0]);
  const fallbackEnd = clampMinutes(start + 90, start + MIN_PLAN_BLOCK_MINUTES, MINUTES_IN_DAY);
  const endFromText = matches[1] ? toMinuteOfDay(matches[1]) : fallbackEnd;
  const end = endFromText > start ? endFromText : fallbackEnd;
  return { startMinutes: start, endMinutes: end };
}

function toMinuteOfDay(match: RegExpExecArray | RegExpMatchArray): number {
  const hourRaw = Number(match?.[1] || 0);
  const minuteRaw = Number(match?.[2] || 0);
  const period = String(match?.[3] || '').toUpperCase();
  let hour = hourRaw % 12;
  if (period === 'PM') hour += 12;
  return clampMinutes(hour * 60 + minuteRaw, 0, MINUTES_IN_DAY - MIN_PLAN_BLOCK_MINUTES);
}

export function getSuggestedPlanSlot(existingItems: PlanItem[], preferredRange: MinuteRange | null, fallbackDurationMinutes: number): MinuteRange {
  const duration = Math.max(MIN_PLAN_BLOCK_MINUTES, fallbackDurationMinutes);
  const sorted = sortPlanItems(existingItems || []);

  if (preferredRange) {
    const preferredStart = clampMinutes(preferredRange.startMinutes, 0, MINUTES_IN_DAY - MIN_PLAN_BLOCK_MINUTES);
    const preferredEnd = clampMinutes(preferredRange.endMinutes, preferredStart + MIN_PLAN_BLOCK_MINUTES, MINUTES_IN_DAY);
    if (!hasOverlappingSlot(sorted, preferredStart, preferredEnd)) {
      return { startMinutes: preferredStart, endMinutes: preferredEnd };
    }
  }

  let cursor = 9 * 60;
  const maxStart = MINUTES_IN_DAY - duration;
  while (cursor <= maxStart) {
    const start = snapMinutes(cursor);
    const end = start + duration;
    if (!hasOverlappingSlot(sorted, start, end)) return { startMinutes: start, endMinutes: end };
    cursor += PLAN_SNAP_MINUTES;
  }

  return {
    startMinutes: clampMinutes(MINUTES_IN_DAY - duration, 0, MINUTES_IN_DAY - MIN_PLAN_BLOCK_MINUTES),
    endMinutes: MINUTES_IN_DAY
  };
}

function hasOverlappingSlot(items: PlanItem[], startMinutes: number, endMinutes: number): boolean {
  return items.some((item) => Math.max(startMinutes, item.startMinutes) < Math.min(endMinutes, item.endMinutes));
}

function escapeIcsText(value: string): string {
  return String(value || '')
    .replaceAll('\\', '\\\\')
    .replaceAll('\r\n', '\n')
    .replaceAll('\n', '\\n')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;');
}

function toCalendarDateTime(dateISO: string, minutesFromMidnight: number): string {
  const normalizedDateISO = toDateOnlyISO(dateISO);
  const [year, month, day] = normalizedDateISO.split('-').map((part) => Number(part));
  const clampedMinutes = clampMinutes(minutesFromMidnight, 0, MINUTES_IN_DAY - 1);
  const hours = Math.floor(clampedMinutes / 60);
  const minutes = clampedMinutes % 60;
  return [
    String(year).padStart(4, '0'),
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0')
  ].join('') + `T${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}00`;
}

function toIcsUtcTimestamp(dateInput: Date): string {
  return new Date(dateInput).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function buildPlannerIcs(dateISO: string, planItems: PlanItem[], { cityName = '', timezone = 'UTC' } = {}): string {
  const dateOnlyISO = toDateOnlyISO(dateISO);
  const sortedItems = sortPlanItems(planItems);
  const timestamp = toIcsUtcTimestamp(new Date());
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Trip Planner//EN',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-TIMEZONE:${timezone}`
  ];
  for (const item of sortedItems) {
    const startValue = toCalendarDateTime(dateOnlyISO, item.startMinutes);
    const endValue = toCalendarDateTime(dateOnlyISO, item.endMinutes);
    const descriptionParts = [
      `Type: ${item.kind === 'event' ? 'Event' : 'Place'}`,
      item.link ? `Link: ${item.link}` : ''
    ].filter(Boolean);
    const isUtc = timezone === 'UTC';
    const dtStart = isUtc ? `DTSTART:${startValue}Z` : `DTSTART;TZID=${timezone}:${startValue}`;
    const dtEnd = isUtc ? `DTEND:${endValue}Z` : `DTEND;TZID=${timezone}:${endValue}`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeIcsText(`${item.id}-${dateOnlyISO}@trip-planner.local`)}`,
      `DTSTAMP:${timestamp}`,
      dtStart,
      dtEnd,
      `SUMMARY:${escapeIcsText(item.title || 'Trip stop')}`,
      `LOCATION:${escapeIcsText(item.locationText || cityName || '')}`,
      `DESCRIPTION:${escapeIcsText(descriptionParts.join('\n'))}`,
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

export function buildGoogleCalendarItemUrl({ dateISO, item, baseLocationText, timezone = 'UTC' }: {
  dateISO: string;
  item: PlanItem;
  baseLocationText: string;
  timezone?: string;
}): string {
  const dateOnlyISO = toDateOnlyISO(dateISO);
  const startValue = toCalendarDateTime(dateOnlyISO, item.startMinutes);
  const endMinutes = Math.max(item.endMinutes, item.startMinutes + MIN_PLAN_BLOCK_MINUTES);
  const endValue = toCalendarDateTime(dateOnlyISO, endMinutes);
  const detailsParts = [
    `Planned time: ${formatMinuteLabel(item.startMinutes)} - ${formatMinuteLabel(item.endMinutes)}`,
    item.kind === 'event' ? 'Type: Event' : 'Type: Place',
    item.link || ''
  ].filter(Boolean);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${item.title} - ${formatDate(dateOnlyISO, timezone)}`,
    dates: `${startValue}/${endValue}`,
    details: detailsParts.join('\n'),
    location: item.locationText || baseLocationText || '',
    ctz: timezone
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildGoogleCalendarStopUrls({ dateISO, planItems, baseLocationText, timezone = 'UTC' }: {
  dateISO: string;
  planItems: PlanItem[];
  baseLocationText: string;
  timezone?: string;
}): string[] {
  const sortedItems = sortPlanItems(planItems);
  return sortedItems.map((item) => buildGoogleCalendarItemUrl({ dateISO, item, baseLocationText, timezone }));
}
