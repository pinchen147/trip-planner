'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const mono = "var(--font-jetbrains, 'JetBrains Mono', monospace)";
const sans = "var(--font-space-grotesk, 'Space Grotesk', sans-serif)";

const DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface DateRangePickerProps {
  startDate: string; // YYYY-MM-DD or ''
  endDate: string;   // YYYY-MM-DD or ''
  onChange: (start: string, end: string) => void;
  startPlaceholder?: string;
  endPlaceholder?: string;
  compact?: boolean; // single month for small spaces
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplay(s: string): string {
  const d = parseDate(s);
  if (!d) return '';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isBeforeDay(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime() && !isSameDay(a, b);
}

function isAfterDay(a: Date, b: Date): boolean {
  return a.getTime() > b.getTime() && !isSameDay(a, b);
}

function isBetween(d: Date, start: Date, end: Date): boolean {
  return d.getTime() > start.getTime() && d.getTime() < end.getTime();
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  let startDay = first.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];

  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

type SelectionPhase = 'start' | 'end';

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  startPlaceholder = 'Check in',
  endPlaceholder = 'Check out',
  compact = false,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<SelectionPhase>('start');
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);

  const startD = parseDate(startDate);
  const endD = parseDate(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const initial = startD || today;
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const containerRef = useRef<HTMLDivElement>(null);

  function handleOpen(selectPhase: SelectionPhase) {
    const target = selectPhase === 'end' && endD ? endD : startD || today;
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
    setPhase(selectPhase);
    setOpen(true);
    setSlideDir(null);
  }

  // Click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  function prevMonth() {
    setSlideDir('right');
    setViewMonth((m) => {
      if (m === 0) { setViewYear((y) => y - 1); return 11; }
      return m - 1;
    });
  }

  function nextMonth() {
    setSlideDir('left');
    setViewMonth((m) => {
      if (m === 11) { setViewYear((y) => y + 1); return 0; }
      return m + 1;
    });
  }

  function handleDayClick(d: Date) {
    if (phase === 'start') {
      // If clicked date is after current end, clear end
      if (endD && isAfterDay(d, endD)) {
        onChange(fmt(d), '');
        setPhase('end');
      } else {
        onChange(fmt(d), endDate);
        setPhase('end');
      }
    } else {
      // Selecting end date
      if (startD && isBeforeDay(d, startD)) {
        // Clicked before start — swap: this becomes the new start
        onChange(fmt(d), startDate);
        setPhase('end');
      } else {
        onChange(startDate, fmt(d));
        // Done — close after a brief moment so user sees the selection
        setTimeout(() => setOpen(false), 180);
      }
    }
  }

  // Second month
  const month2 = viewMonth === 11 ? 0 : viewMonth + 1;
  const year2 = viewMonth === 11 ? viewYear + 1 : viewYear;

  function renderMonth(y: number, m: number) {
    const cells = getCalendarDays(y, m);

    return (
      <div className="flex flex-col">
        {/* Month title */}
        <div className="flex items-center justify-center" style={{ height: 32 }}>
          <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: '#F5F5F5', letterSpacing: -0.3 }}>
            {MONTHS_FULL[m]} {y}
          </span>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mt-1">
          {DAYS.map((d) => (
            <div key={d} className="flex items-center justify-center" style={{ height: 24, fontFamily: mono, fontSize: 9, fontWeight: 600, color: '#3a3a3a', letterSpacing: 0.5 }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 mt-0.5">
          {cells.map((cell, i) => {
            if (!cell) return <div key={`e-${i}`} style={{ height: 36 }} />;

            const isToday = isSameDay(cell, today);
            const isStart = startD ? isSameDay(cell, startD) : false;
            const isEnd = endD ? isSameDay(cell, endD) : false;
            const isPast = cell < today && !isToday;

            // Range detection
            const effectiveEnd = phase === 'end' && hoverDate && startD && isAfterDay(hoverDate, startD) ? hoverDate : endD;
            const inRange = startD && effectiveEnd && !isStart && !isEnd
              ? isBetween(cell, startD, effectiveEnd)
              : false;

            // Hover preview range
            const isHoverEnd = hoverDate && phase === 'end' && startD && isSameDay(cell, hoverDate) && isAfterDay(hoverDate, startD);

            // Edge detection for range background shape
            const isRangeStart = isStart && effectiveEnd && isAfterDay(effectiveEnd, startD!);
            const isRangeEnd = (isEnd || isHoverEnd) && startD && isAfterDay(cell, startD);

            let bgColor = 'transparent';
            let textColor = isPast ? '#2a2a2a' : '#a3a3a3';
            let fontWeight = 400;
            if (isStart || isEnd) {
              bgColor = '#00E87B';
              textColor = '#0A0A0A';
              fontWeight = 700;
            } else if (isHoverEnd) {
              bgColor = 'rgba(0, 232, 123, 0.5)';
              textColor = '#0A0A0A';
              fontWeight = 600;
            } else if (inRange) {
              rangeBg = 'rgba(0, 232, 123, 0.08)';
              textColor = '#00E87B';
              fontWeight = 500;
            } else if (isToday) {
              textColor = '#00E87B';
              fontWeight = 600;
            }

            return (
              <div
                key={`d-${i}`}
                className="relative flex items-center justify-center"
                style={{ height: 36 }}
              >
                {/* Range background strip */}
                {(inRange || isRangeStart || isRangeEnd) && (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'rgba(0, 232, 123, 0.08)',
                      // Clip the left side for range start, right side for range end
                      clipPath: isRangeStart
                        ? 'inset(0 0 0 50%)'
                        : isRangeEnd
                          ? 'inset(0 50% 0 0)'
                          : undefined,
                    }}
                  />
                )}

                <button
                  type="button"
                  disabled={isPast}
                  onClick={() => handleDayClick(cell)}
                  onMouseEnter={() => setHoverDate(cell)}
                  onMouseLeave={() => setHoverDate(null)}
                  className="relative z-10 flex items-center justify-center border-none cursor-pointer disabled:cursor-not-allowed transition-all duration-100"
                  style={{
                    width: 32,
                    height: 32,
                    fontFamily: mono,
                    fontSize: 12,
                    fontWeight,
                    color: textColor,
                    background: bgColor,
                    borderRadius: (isStart || isEnd || isHoverEnd) ? 999 : 0,
                  }}
                  onMouseOver={(e) => {
                    if (!isPast && !isStart && !isEnd && !isHoverEnd) {
                      e.currentTarget.style.background = '#1A1A1A';
                      e.currentTarget.style.borderRadius = '999px';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isStart && !isEnd && !isHoverEnd) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderRadius = '0';
                    }
                  }}
                >
                  {cell.getDate()}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Compute the number of nights
  const nightCount = startD && endD ? Math.round((endD.getTime() - startD.getTime()) / 86400000) : 0;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger — date range display */}
      <div className="flex items-center gap-0">
        <button
          type="button"
          onClick={() => open && phase === 'start' ? setOpen(false) : handleOpen('start')}
          className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer px-2 py-1.5 transition-all duration-150"
          style={{
            fontFamily: mono,
            fontSize: 11,
            color: startDate ? '#a3a3a3' : '#3a3a3a',
            borderBottom: open && phase === 'start' ? '2px solid #00E87B' : '2px solid transparent',
          }}
        >
          <Calendar size={12} style={{ color: '#525252', flexShrink: 0 }} />
          {startDate ? formatDisplay(startDate) : startPlaceholder}
        </button>
        <span style={{ color: '#333', fontSize: 11, fontFamily: mono, userSelect: 'none' }}>—</span>
        <button
          type="button"
          onClick={() => open && phase === 'end' ? setOpen(false) : handleOpen('end')}
          className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer px-2 py-1.5 transition-all duration-150"
          style={{
            fontFamily: mono,
            fontSize: 11,
            color: endDate ? '#a3a3a3' : '#3a3a3a',
            borderBottom: open && phase === 'end' ? '2px solid #00E87B' : '2px solid transparent',
          }}
        >
          {endDate ? formatDisplay(endDate) : endPlaceholder}
        </button>
      </div>

      {/* Calendar dropdown */}
      {open && (
        <div
          className="absolute z-50"
          style={{
            top: 'calc(100% + 8px)',
            right: 0,
            background: '#111111',
            border: '1px solid #1E1E1E',
            boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
            animation: 'dateRangeSlideIn 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
            overflow: 'hidden',
          }}
        >
          {/* Navigation header */}
          <div
            className="flex items-center justify-between px-4"
            style={{ height: 44, borderBottom: '1px solid #1A1A1A' }}
          >
            <button
              type="button"
              onClick={prevMonth}
              className="flex items-center justify-center bg-transparent border-none cursor-pointer transition-colors hover:bg-[#1A1A1A]"
              style={{ width: 32, height: 32, color: '#666', borderRadius: 999 }}
            >
              <ChevronLeft size={16} />
            </button>

            {/* Phase indicator */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPhase('start')}
                className="bg-transparent border-none cursor-pointer px-2 py-1"
                style={{
                  fontFamily: mono,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  color: phase === 'start' ? '#00E87B' : '#525252',
                  borderBottom: phase === 'start' ? '1.5px solid #00E87B' : '1.5px solid transparent',
                }}
              >
                {startDate ? formatDisplay(startDate) : 'START'}
              </button>
              {nightCount > 0 && (
                <span style={{ fontFamily: mono, fontSize: 9, color: '#3a3a3a' }}>
                  {nightCount} night{nightCount === 1 ? '' : 's'}
                </span>
              )}
              <button
                type="button"
                onClick={() => setPhase('end')}
                className="bg-transparent border-none cursor-pointer px-2 py-1"
                style={{
                  fontFamily: mono,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  color: phase === 'end' ? '#00E87B' : '#525252',
                  borderBottom: phase === 'end' ? '1.5px solid #00E87B' : '1.5px solid transparent',
                }}
              >
                {endDate ? formatDisplay(endDate) : 'END'}
              </button>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="flex items-center justify-center bg-transparent border-none cursor-pointer transition-colors hover:bg-[#1A1A1A]"
              style={{ width: 32, height: 32, color: '#666', borderRadius: 999 }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Calendar body */}
          <div
            className={compact ? 'flex px-3 pb-3 pt-1' : 'flex px-3 pb-3 pt-1 gap-4'}
            key={`${viewYear}-${viewMonth}`}
            style={{
              animation: slideDir
                ? `dateRangeMonth${slideDir === 'left' ? 'Left' : 'Right'} 0.22s cubic-bezier(0.22, 1, 0.36, 1)`
                : undefined,
            }}
          >
            <div style={{ width: compact ? 252 : 252 }}>
              {renderMonth(viewYear, viewMonth)}
            </div>
            {!compact && (
              <>
                <div style={{ width: 1, background: '#1A1A1A', alignSelf: 'stretch', marginTop: 32 }} />
                <div style={{ width: 252 }}>
                  {renderMonth(year2, month2)}
                </div>
              </>
            )}
          </div>

          {/* Footer shortcuts */}
          <div
            className="flex items-center justify-between px-4"
            style={{ height: 36, borderTop: '1px solid #1A1A1A' }}
          >
            <button
              type="button"
              onClick={() => {
                onChange('', '');
                setPhase('start');
              }}
              className="bg-transparent border-none cursor-pointer px-2 py-1 transition-colors hover:bg-[#1A1A1A]"
              style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, color: '#525252', letterSpacing: 0.5, borderRadius: 4 }}
            >
              CLEAR
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const t = new Date();
                  t.setHours(0, 0, 0, 0);
                  const weekOut = new Date(t.getTime() + 7 * 86400000);
                  onChange(fmt(t), fmt(weekOut));
                  setTimeout(() => setOpen(false), 180);
                }}
                className="bg-transparent border-none cursor-pointer px-2 py-1 transition-colors hover:bg-[#1A1A1A]"
                style={{ fontFamily: mono, fontSize: 9, fontWeight: 500, color: '#00E87B', letterSpacing: 0.5, borderRadius: 4 }}
              >
                THIS WEEK
              </button>
              <button
                type="button"
                onClick={() => {
                  const t = new Date();
                  t.setHours(0, 0, 0, 0);
                  const weekendFri = new Date(t);
                  weekendFri.setDate(t.getDate() + ((5 - t.getDay() + 7) % 7 || 7));
                  const weekendSun = new Date(weekendFri.getTime() + 2 * 86400000);
                  onChange(fmt(weekendFri), fmt(weekendSun));
                  setTimeout(() => setOpen(false), 180);
                }}
                className="bg-transparent border-none cursor-pointer px-2 py-1 transition-colors hover:bg-[#1A1A1A]"
                style={{ fontFamily: mono, fontSize: 9, fontWeight: 500, color: '#00E87B', letterSpacing: 0.5, borderRadius: 4 }}
              >
                WEEKEND
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
