'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTrip } from '@/components/providers/TripProvider';
import { MapPin, ChevronDown, Plus } from 'lucide-react';

export default function TripSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    trips, cities, currentTripId, currentCityId, currentCity,
    switchTrip, switchCityLeg, timezone,
  } = useTrip();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const activeTrip = trips.find((t: any) => (t._id || t.id) === currentTripId);
  const cityLabel = currentCity?.name || currentCityId || 'No city';
  const tzAbbrev = timezone ? new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'short' })
    .formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value || '' : '';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-3 py-1.5 cursor-pointer bg-transparent transition-colors"
        style={{
          background: '#111111',
          border: '1px solid #262626',
          fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
        }}
      >
        <MapPin size={12} style={{ color: '#00E87B' }} />
        <span className="text-[10px] font-medium" style={{ color: '#737373' }}>
          {cityLabel}{tzAbbrev ? ` · ${tzAbbrev}` : ''}
        </span>
        <ChevronDown size={10} style={{ color: '#525252' }} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 min-w-[220px] py-1 rounded-md shadow-lg"
          style={{ background: '#111111', border: '1px solid #262626' }}
        >
          {/* Trips section */}
          {trips.length > 0 && (
            <>
              <div
                className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider"
                style={{ color: '#525252', fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}
              >
                Trips
              </div>
              {trips.map((trip: any) => {
                const id = trip._id || trip.id;
                const urlId = trip.urlId || id;
                const isActive = id === currentTripId;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      switchTrip(id);
                      const segments = pathname.split('/');
                      const currentTab = segments[3] || 'planning';
                      router.push(`/trips/${urlId}/${currentTab}`);
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 cursor-pointer bg-transparent border-none transition-colors hover:bg-[#1a1a1a]"
                    style={{
                      fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
                      fontSize: 11,
                      color: isActive ? '#00E87B' : '#a3a3a3',
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    {trip.name || 'Untitled Trip'}
                  </button>
                );
              })}
            </>
          )}

          {/* City legs for active trip */}
          {activeTrip?.legs?.length > 1 && (
            <>
              <div className="mx-2 my-1 border-t" style={{ borderColor: '#262626' }} />
              <div
                className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider"
                style={{ color: '#525252', fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}
              >
                Cities
              </div>
              {activeTrip.legs.map((leg: any, i: number) => {
                const city = cities.find((c: any) => c.slug === leg.cityId);
                const isActive = leg.cityId === currentCityId;
                return (
                  <button
                    key={`${leg.cityId}-${i}`}
                    type="button"
                    onClick={() => { switchCityLeg(leg.cityId); setOpen(false); }}
                    className="w-full text-left px-3 py-1.5 cursor-pointer bg-transparent border-none transition-colors hover:bg-[#1a1a1a]"
                    style={{
                      fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
                      fontSize: 11,
                      color: isActive ? '#00E87B' : '#a3a3a3',
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    <MapPin size={10} className="inline mr-1.5" style={{ color: isActive ? '#00E87B' : '#525252' }} />
                    {city?.name || leg.cityId}
                    {leg.startDate && (
                      <span className="ml-2 text-[9px]" style={{ color: '#525252' }}>
                        {leg.startDate}{leg.endDate ? `–${leg.endDate}` : ''}
                      </span>
                    )}
                  </button>
                );
              })}
            </>
          )}

          {trips.length === 0 && (
            <div
              className="px-3 py-2 text-[11px]"
              style={{ color: '#525252', fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}
            >
              No trips yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
