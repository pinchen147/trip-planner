'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTrip } from '@/components/providers/TripProvider';
import { formatMinuteLabel, formatHour, snapMinutes, clampMinutes } from '@/lib/helpers';
import { PLAN_HOUR_HEIGHT, PLAN_MINUTE_HEIGHT } from '@/lib/planner-helpers';

const mono = "var(--font-jetbrains, 'JetBrains Mono', monospace)";
const sans = "var(--font-space-grotesk, 'Space Grotesk', sans-serif)";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MIN_BLOCK_MINUTES = 30;

function computeOverlapColumns(items: any[]) {
  const sorted = [...items].sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);
  const overlaps = (a: any, b: any) => a.startMinutes < b.endMinutes && a.endMinutes > b.startMinutes;
  const groups: any[][] = [];
  for (const item of sorted) {
    let merged = false;
    for (const group of groups) {
      if (group.some((g) => overlaps(item, g))) { group.push(item); merged = true; break; }
    }
    if (!merged) groups.push([item]);
  }
  const columns = new Map<string, number>();
  const totalCols = new Map<string, number>();
  for (const group of groups) {
    if (group.length === 1) { columns.set(group[0].id, 0); totalCols.set(group[0].id, 1); continue; }
    const cols: any[][] = [];
    for (const item of group) {
      let col = 0;
      while (cols[col]?.some((g) => overlaps(item, g))) col++;
      if (!cols[col]) cols[col] = [];
      cols[col].push(item);
      columns.set(item.id, col);
    }
    for (const item of group) totalCols.set(item.id, cols.length);
  }
  return { columns, totalCols };
}

function formatDateLarge(dateISO: string, _tz: string): string {
  if (!dateISO) return '';
  const [y, m, d] = dateISO.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatWeekday(dateISO: string): string {
  if (!dateISO) return '';
  const [y, m, d] = dateISO.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

function isTodayISO(dateISO: string): boolean {
  return dateISO === new Date().toISOString().slice(0, 10);
}

function getNowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export default function DayPlanCalendar() {
  const {
    selectedDate, setSelectedDate, uniqueDates,
    dayPlanItems, activePlanId, setActivePlanId,
    startPlanDrag, removePlanItem, addCustomPlanItem, updatePlanItem,
    timezone, currentCity,
  } = useTrip();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nowMinutes, setNowMinutes] = useState(getNowMinutes);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Current time indicator update
  useEffect(() => {
    const interval = setInterval(() => setNowMinutes(getNowMinutes()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to 8 AM or first item on mount / date change
  useEffect(() => {
    if (!scrollRef.current) return;
    const firstItem = dayPlanItems[0];
    const scrollToMinute = firstItem ? Math.max(0, firstItem.startMinutes - 60) : 8 * 60;
    scrollRef.current.scrollTop = scrollToMinute * PLAN_MINUTE_HEIGHT;
  }, [selectedDate, dayPlanItems.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus input when editing
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Day navigation
  const dateIndex = uniqueDates.indexOf(selectedDate);
  const canPrev = dateIndex > 0;
  const canNext = dateIndex < uniqueDates.length - 1;

  const goToday = useCallback(() => {
    const todayISO = new Date().toISOString().slice(0, 10);
    if (uniqueDates.includes(todayISO)) {
      setSelectedDate(todayISO);
    }
  }, [uniqueDates, setSelectedDate]);

  const goPrev = useCallback(() => {
    if (canPrev) setSelectedDate(uniqueDates[dateIndex - 1]);
  }, [canPrev, dateIndex, uniqueDates, setSelectedDate]);

  const goNext = useCallback(() => {
    if (canNext) setSelectedDate(uniqueDates[dateIndex + 1]);
  }, [canNext, dateIndex, uniqueDates, setSelectedDate]);

  // Keyboard nav
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (editingId) return;
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goPrev, goNext, editingId]);

  // Double-click to create
  const handleGridDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedDate) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top + e.currentTarget.scrollTop;
    const rawMinutes = y / PLAN_MINUTE_HEIGHT;
    const startMinutes = snapMinutes(clampMinutes(Math.floor(rawMinutes), 0, 24 * 60 - MIN_BLOCK_MINUTES));
    const endMinutes = startMinutes + 60;

    // Check if clicking on an existing item
    const target = e.target as HTMLElement;
    if (target.closest('[data-plan-item]')) return;

    const newId = addCustomPlanItem(startMinutes, endMinutes, 'New Plan');
    if (newId) {
      setEditingId(newId);
      setActivePlanId(newId);
    }
  }, [selectedDate, addCustomPlanItem, setActivePlanId]);

  // Inline edit handlers
  const handleEditSubmit = useCallback((itemId: string, title: string) => {
    const trimmed = title.trim();
    if (trimmed) {
      updatePlanItem(itemId, { title: trimmed });
    } else {
      removePlanItem(itemId);
    }
    setEditingId(null);
  }, [updatePlanItem, removePlanItem]);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent, itemId: string) => {
    if (e.key === 'Enter') {
      handleEditSubmit(itemId, (e.target as HTMLInputElement).value);
    } else if (e.key === 'Escape') {
      // If it's a new item with default title, remove it
      const item = dayPlanItems.find((i) => i.id === itemId);
      if (item?.title === 'New Plan') {
        removePlanItem(itemId);
      }
      setEditingId(null);
    }
  }, [handleEditSubmit, dayPlanItems, removePlanItem]);

  const layout = computeOverlapColumns(dayPlanItems);
  const showNowLine = selectedDate && isTodayISO(selectedDate) && nowMinutes >= 0 && nowMinutes < 24 * 60;

  if (!selectedDate) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4" style={{ background: '#0A0A0A' }}>
        <p style={{ fontFamily: mono, fontSize: 12, color: '#525252' }}>
          Select a date to start planning
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: '#0A0A0A' }}>
      {/* Date header */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{ padding: '12px 16px', borderBottom: '1px solid #1E1E1E' }}
      >
        <div className="flex flex-col gap-0.5">
          <h2
            className="m-0"
            style={{ fontFamily: sans, fontSize: 22, fontWeight: 700, color: '#F5F5F5', letterSpacing: -0.5 }}
          >
            {formatDateLarge(selectedDate, timezone)}
          </h2>
          <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, color: '#00E87B' }}>
            {formatWeekday(selectedDate)}
            {currentCity?.name ? ` · ${currentCity.name}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={!canPrev}
            className="flex items-center justify-center bg-transparent border-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-[#1A1A1A]"
            style={{ width: 28, height: 28, color: '#737373', border: '1px solid #262626', background: '#1A1A1A' }}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="flex items-center justify-center cursor-pointer transition-colors hover:bg-[#262626]"
            style={{
              padding: '4px 12px', background: '#1A1A1A', border: '1px solid #262626',
              fontFamily: mono, fontSize: 9, fontWeight: 600, color: '#737373', letterSpacing: 0.5,
            }}
          >
            TODAY
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canNext}
            className="flex items-center justify-center bg-transparent border-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-[#1A1A1A]"
            style={{ width: 28, height: 28, color: '#737373', border: '1px solid #262626', background: '#1A1A1A' }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Time grid */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
        onDoubleClick={handleGridDoubleClick}
        style={{ position: 'relative' }}
      >
        <div style={{ position: 'relative', height: 24 * PLAN_HOUR_HEIGHT }}>
          {/* Hour lines */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              style={{
                position: 'absolute',
                top: hour * PLAN_HOUR_HEIGHT,
                left: 0,
                right: 0,
                height: PLAN_HOUR_HEIGHT,
                borderTop: '1px solid #1A1A1A',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 8,
                  top: -7,
                  fontFamily: mono,
                  fontSize: 9,
                  fontWeight: hour === 12 ? 600 : 500,
                  color: '#525252',
                  background: '#0A0A0A',
                  padding: '0 4px',
                  zIndex: 2,
                }}
              >
                {hour === 0 ? '' : hour === 12 ? 'NOON' : formatHour(hour)}
              </div>
            </div>
          ))}

          {/* Current time indicator */}
          {showNowLine && (
            <div
              style={{
                position: 'absolute',
                top: nowMinutes * PLAN_MINUTE_HEIGHT,
                left: 48,
                right: 0,
                height: 2,
                background: '#EF4444',
                zIndex: 10,
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: -5,
                  top: -4,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#EF4444',
                }}
              />
            </div>
          )}

          {/* Plan items */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 52, right: 8 }}>
            {dayPlanItems.map((item) => {
              const top = item.startMinutes * PLAN_MINUTE_HEIGHT;
              const height = Math.max(28, (item.endMinutes - item.startMinutes) * PLAN_MINUTE_HEIGHT);
              const col = layout.columns.get(item.id) || 0;
              const total = layout.totalCols.get(item.id) || 1;
              const widthPct = 100 / total;
              const leftPct = col * widthPct;
              const isActive = activePlanId === item.id;
              const isEditing = editingId === item.id;
              const isEvent = item.kind === 'event';
              const accent = isEvent ? '#F59E0B' : '#00E87B';

              return (
                <div
                  key={item.id}
                  data-plan-item
                  style={{
                    position: 'absolute',
                    top,
                    height,
                    width: `${widthPct}%`,
                    left: `${leftPct}%`,
                    background: isEvent ? 'rgba(245, 158, 11, 0.10)' : 'rgba(0, 232, 123, 0.08)',
                    borderLeft: `3px solid ${accent}`,
                    cursor: 'grab',
                    zIndex: isActive ? 5 : 1,
                    boxShadow: isActive ? `0 0 0 2px ${accent}40` : 'none',
                    transition: 'box-shadow 0.15s',
                    overflow: 'hidden',
                  }}
                  onPointerDown={(e) => {
                    if (isEditing) return;
                    setActivePlanId(item.id);
                    startPlanDrag(e, item, 'move');
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingId(item.id);
                  }}
                >
                  {/* Resize handle top */}
                  <div
                    className="absolute left-0 right-0 top-0 cursor-ns-resize"
                    style={{ height: 6 }}
                    onPointerDown={(e) => { e.stopPropagation(); startPlanDrag(e, item, 'resize-start'); }}
                  />

                  {/* Content */}
                  <div style={{ padding: '6px 28px 6px 8px', overflow: 'hidden' }}>
                    {isEditing ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        defaultValue={item.title}
                        className="bg-transparent border-none outline-none p-0 w-full"
                        style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: '#F5F5F5' }}
                        onBlur={(e) => handleEditSubmit(item.id, e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(e, item.id)}
                      />
                    ) : (
                      <div
                        className="truncate"
                        style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: '#F5F5F5' }}
                      >
                        {item.title}
                      </div>
                    )}
                    <div
                      className="truncate"
                      style={{ fontFamily: mono, fontSize: 9, fontWeight: 500, color: accent, marginTop: 1 }}
                    >
                      {formatMinuteLabel(item.startMinutes)} – {formatMinuteLabel(item.endMinutes)}
                    </div>
                    {item.locationText && (
                      <div
                        className="truncate"
                        style={{ fontFamily: mono, fontSize: 9, color: '#525252', marginTop: 1 }}
                      >
                        {item.locationText}
                      </div>
                    )}
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    className="absolute bg-transparent border-none cursor-pointer transition-colors hover:bg-[#ffffff10]"
                    style={{ top: 4, right: 4, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={(e) => { e.stopPropagation(); removePlanItem(item.id); }}
                  >
                    <X size={10} style={{ color: '#525252' }} />
                  </button>

                  {/* Resize handle bottom */}
                  <div
                    className="absolute left-0 right-0 bottom-0 cursor-ns-resize"
                    style={{ height: 6 }}
                    onPointerDown={(e) => { e.stopPropagation(); startPlanDrag(e, item, 'resize-end'); }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom hint */}
      <div
        className="shrink-0 flex items-center justify-center"
        style={{
          height: 28,
          borderTop: '1px solid #1E1E1E',
          fontFamily: mono,
          fontSize: 9,
          color: '#3a3a3a',
          letterSpacing: 0.3,
        }}
      >
        Double-click to add · Drag to move · Edges to resize
      </div>
    </div>
  );
}
