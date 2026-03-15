'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const mono = "var(--font-jetbrains, 'JetBrains Mono', monospace)";
const sans = "var(--font-space-grotesk, 'Space Grotesk', sans-serif)";

const DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface DatePickerProps {
  value: string; // YYYY-MM-DD or ''
  onChange: (value: string) => void;
  placeholder?: string;
  minDate?: string;
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
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
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  // Monday = 0, Sunday = 6
  let startDay = first.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];

  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  // Pad to complete row
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

export function DatePicker({ value, onChange, placeholder = 'Select date', minDate }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseDate(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minD = parseDate(minDate || '');

  const initial = selected || today;
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const containerRef = useRef<HTMLDivElement>(null);

  function handleOpen() {
    const target = parseDate(value) || new Date();
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
    setOpen(true);
  }

  // Click-outside
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

  // Escape key
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  function prevMonth() {
    setViewMonth((m) => {
      if (m === 0) { setViewYear((y) => y - 1); return 11; }
      return m - 1;
    });
  }

  function nextMonth() {
    setViewMonth((m) => {
      if (m === 11) { setViewYear((y) => y + 1); return 0; }
      return m + 1;
    });
  }

  function handleSelect(d: Date) {
    onChange(fmt(d));
    setOpen(false);
  }

  const cells = getCalendarDays(viewYear, viewMonth);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => open ? setOpen(false) : handleOpen()}
        className="bg-transparent border-none cursor-pointer p-0 text-left"
        style={{
          fontFamily: mono,
          fontSize: 11,
          color: value ? '#a3a3a3' : '#3a3a3a',
        }}
      >
        {value ? formatDisplay(value) : placeholder}
      </button>

      {/* Calendar dropdown */}
      {open && (
        <div
          className="absolute z-50"
          style={{
            top: 'calc(100% + 8px)',
            right: 0,
            width: 280,
            background: '#111111',
            border: '1px solid #1E1E1E',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            animation: 'selectSlideIn 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {/* Month header */}
          <div
            className="flex items-center justify-between px-3"
            style={{ height: 40, borderBottom: '1px solid #1A1A1A' }}
          >
            <button
              type="button"
              onClick={prevMonth}
              className="flex items-center justify-center bg-transparent border-none cursor-pointer transition-colors hover:bg-[#1A1A1A]"
              style={{ width: 28, height: 28, color: '#666' }}
            >
              <ChevronLeft size={14} />
            </button>
            <span
              style={{
                fontFamily: sans,
                fontSize: 13,
                fontWeight: 600,
                color: '#F5F5F5',
                letterSpacing: -0.3,
              }}
            >
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="flex items-center justify-center bg-transparent border-none cursor-pointer transition-colors hover:bg-[#1A1A1A]"
              style={{ width: 28, height: 28, color: '#666' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 px-2 pt-2">
            {DAYS.map((d) => (
              <div
                key={d}
                className="flex items-center justify-center"
                style={{
                  height: 24,
                  fontFamily: mono,
                  fontSize: 9,
                  fontWeight: 600,
                  color: '#525252',
                  letterSpacing: 0.5,
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 px-2 pb-2 pt-0.5">
            {cells.map((cell, i) => {
              if (!cell) {
                return <div key={`e-${i}`} style={{ height: 32 }} />;
              }

              const isToday = isSameDay(cell, today);
              const isSelected = selected ? isSameDay(cell, selected) : false;
              const isDisabled = minD ? cell < minD : false;

              return (
                <button
                  key={`d-${i}`}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelect(cell)}
                  className="flex items-center justify-center bg-transparent border-none cursor-pointer transition-colors disabled:cursor-not-allowed"
                  style={{
                    height: 32,
                    fontFamily: mono,
                    fontSize: 11,
                    fontWeight: isSelected ? 700 : isToday ? 600 : 400,
                    color: isDisabled
                      ? '#2a2a2a'
                      : isSelected
                        ? '#0A0A0A'
                        : isToday
                          ? '#00E87B'
                          : '#a3a3a3',
                    background: isSelected ? '#00E87B' : 'transparent',
                    borderRadius: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !isDisabled) e.currentTarget.style.background = '#1A1A1A';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {cell.getDate()}
                </button>
              );
            })}
          </div>

          {/* Today shortcut */}
          <div
            className="flex items-center justify-center px-3"
            style={{ height: 32, borderTop: '1px solid #1A1A1A' }}
          >
            <button
              type="button"
              onClick={() => handleSelect(today)}
              className="bg-transparent border-none cursor-pointer transition-colors hover:bg-[#1A1A1A] px-2 py-1"
              style={{
                fontFamily: mono,
                fontSize: 10,
                fontWeight: 500,
                color: '#00E87B',
                letterSpacing: 0.5,
              }}
            >
              TODAY
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
