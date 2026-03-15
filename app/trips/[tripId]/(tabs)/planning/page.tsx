'use client';

import DayPlanCalendar from '@/components/DayPlanCalendar';
import { useTrip } from '@/components/providers/TripProvider';

export default function PlanningPage() {
  const { sidebarRef } = useTrip();

  return (
    <aside className="border-l border-border bg-card h-full min-h-0 overflow-hidden sidebar-responsive" ref={sidebarRef}>
      <DayPlanCalendar />
    </aside>
  );
}
