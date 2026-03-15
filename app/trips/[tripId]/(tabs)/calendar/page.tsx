'use client';

import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTrip } from '@/components/providers/TripProvider';
import {
  formatMonthYear, formatDayOfMonth, toMonthISO, buildCalendarGridDates
} from '@/lib/helpers';

export default function CalendarPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params?.tripId as string;
  const {
    calendarAnchorISO, selectedDate, setSelectedDate, setShowAllEvents,
    eventsByDate, planItemsByDate, shiftCalendarMonth, timezone
  } = useTrip();

  const calendarDays = buildCalendarGridDates(calendarAnchorISO);

  return (
    <section className="flex-1 min-h-0 overflow-y-auto p-8 max-sm:p-3.5 bg-bg">
      <div className="w-full max-w-[960px] mx-auto flex flex-col items-center gap-6">
        {/* Header */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => shiftCalendarMonth(-1)}
            className="flex items-center justify-center cursor-pointer"
            style={{ padding: '6px 12px', border: '1px solid #262626', background: 'transparent' }}
          >
            <ChevronLeft size={14} style={{ color: '#737373' }} />
          </button>
          <h2
            className="m-0"
            style={{
              fontFamily: "var(--font-space-grotesk, 'Space Grotesk', sans-serif)",
              fontSize: 22,
              fontWeight: 600,
              color: '#F5F5F5',
              letterSpacing: -0.5,
            }}
          >
            {formatMonthYear(calendarAnchorISO, timezone)}
          </h2>
          <button
            type="button"
            onClick={() => shiftCalendarMonth(1)}
            className="flex items-center justify-center cursor-pointer"
            style={{ padding: '6px 12px', border: '1px solid #262626', background: 'transparent' }}
          >
            <ChevronRight size={14} style={{ color: '#737373' }} />
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5 text-[10px]" style={{ color: '#737373', fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)", fontWeight: 500 }}>
            <span className="inline-block" style={{ width: 12, height: 4, background: '#3B82F6' }} />London (GMT)
          </span>
          <span className="flex items-center gap-1.5 text-[10px]" style={{ color: '#737373', fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)", fontWeight: 500 }}>
            <span className="inline-block" style={{ width: 12, height: 4, background: '#A855F7' }} />Paris (CET)
          </span>
          <span className="flex items-center gap-1.5 text-[10px]" style={{ color: '#737373', fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)", fontWeight: 500 }}>
            <span className="inline-block" style={{ width: 6, height: 6, background: '#F59E0B' }} />Events
          </span>
          <span className="flex items-center gap-1.5 text-[10px]" style={{ color: '#737373', fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)", fontWeight: 500 }}>
            <span className="inline-block" style={{ width: 6, height: 6, background: '#00E87B' }} />Plans
          </span>
        </div>

        {/* Day headers */}
        <div className="w-full max-w-[840px]">
        <div className="grid grid-cols-7 gap-0.5 mb-0.5">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((wd) => (
            <span
              key={wd}
              className="text-center py-2"
              style={{
                fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
                fontSize: 10,
                fontWeight: 600,
                color: '#525252',
                letterSpacing: 1,
              }}
            >
              {wd}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {calendarDays.map((dayISO) => {
            const isCurrentMonth = toMonthISO(dayISO) === toMonthISO(calendarAnchorISO);
            const isSelected = dayISO === selectedDate;
            const eventCount = eventsByDate.get(dayISO) || 0;
            const planCount = planItemsByDate.get(dayISO) || 0;
            return (
              <button
                key={dayISO}
                type="button"
                className="flex flex-col gap-1 text-left cursor-pointer transition-all duration-200"
                style={{
                  background: isCurrentMonth ? '#111111' : '#0A0A0A',
                  border: isSelected ? '1px solid #00E87B' : '1px solid #1E1E1E',
                  padding: 8,
                  height: 90,
                  opacity: isCurrentMonth ? 1 : 0.4,
                }}
                onClick={() => { setSelectedDate(dayISO); setShowAllEvents(false); router.push(`/trips/${tripId}/planning`); }}
              >
                <span
                  className="text-xs font-semibold"
                  style={{
                    fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
                    color: isSelected ? '#00E87B' : '#F5F5F5',
                  }}
                >
                  {formatDayOfMonth(dayISO, timezone)}
                </span>
                {eventCount > 0 && (
                  <span
                    className="text-[9px]"
                    style={{ fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)", color: '#F59E0B' }}
                  >
                    {eventCount} event{eventCount !== 1 ? 's' : ''}
                  </span>
                )}
                {planCount > 0 && (
                  <span
                    className="text-[9px]"
                    style={{ fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)", color: '#00E87B' }}
                  >
                    {planCount} plan{planCount !== 1 ? 's' : ''}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        </div>
        <p
          className="text-center"
          style={{
            fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
            fontSize: 10,
            color: '#333',
          }}
        >
          Click a date to jump to its day plan. Trip leg colors show city transitions.
        </p>
      </div>
    </section>
  );
}
