'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Map, Plus, MapPin, Loader2, ArrowRight, X, Search,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { CityPickerModal, type SelectedCity } from '@/components/CityPickerModal';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { formatTripDateRange } from '@/lib/mock-data';

interface TripLeg {
  cityId: string;
  startDate: string;
  endDate: string;
}

interface Trip {
  _id: string;
  urlId: string;
  name: string;
  legs: TripLeg[];
  createdAt: string;
  updatedAt: string;
}

interface City {
  _id: string;
  slug: string;
  name: string;
  timezone: string;
}

const LEG_COLORS = ['#00E87B', '#3B82F6', '#A855F7', '#F59E0B', '#EF4444', '#06B6D4'];

const CITY_GRADIENTS: Record<string, string> = {
  'san-francisco': 'linear-gradient(135deg, #1a3a2a 0%, #0d1f17 100%)',
  'new-york': 'linear-gradient(135deg, #1a2a3a 0%, #0d171f 100%)',
  'london': 'linear-gradient(135deg, #2a1a3a 0%, #170d1f 100%)',
  'paris': 'linear-gradient(135deg, #3a2a1a 0%, #1f170d 100%)',
  'tokyo': 'linear-gradient(135deg, #3a1a2a 0%, #1f0d17 100%)',
  'barcelona': 'linear-gradient(135deg, #3a2a1a 0%, #1f170d 100%)',
  'chicago': 'linear-gradient(135deg, #1a2a2a 0%, #0d1717 100%)',
  'los-angeles': 'linear-gradient(135deg, #2a2a1a 0%, #17170d 100%)',
};

function getCityDisplayName(cityId: string, citiesMap: Record<string, City>): string {
  return citiesMap[cityId]?.name || cityId;
}

function getTripDateRange(legs: TripLeg[]): { start: string; end: string } {
  if (!legs.length) return { start: '', end: '' };
  const starts = legs.map((l) => l.startDate).filter(Boolean).sort();
  const ends = legs.map((l) => l.endDate).filter(Boolean).sort();
  return { start: starts[0] || '', end: ends[ends.length - 1] || '' };
}

function getTripSubtitle(legs: TripLeg[], _citiesMap: Record<string, City>): string | null {
  if (legs.length <= 1) return null;
  return `Multi-leg · ${legs.length} cities`;
}

function getCoverGradient(legs: TripLeg[]): string {
  if (!legs.length) return 'linear-gradient(135deg, #1a1a2e 0%, #0d0d17 100%)';
  const slug = legs[0].cityId;
  return CITY_GRADIENTS[slug] || 'linear-gradient(135deg, #1a1a2e 0%, #0d0d17 100%)';
}

interface DraftLeg {
  city: SelectedCity | null;
  startDate: string;
  endDate: string;
}

const mono = "var(--font-jetbrains, 'JetBrains Mono', monospace)";
const sans = "var(--font-space-grotesk, 'Space Grotesk', sans-serif)";

export default function DashboardPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [citiesMap, setCitiesMap] = useState<Record<string, City>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Search bar state
  const [draftLegs, setDraftLegs] = useState<DraftLeg[]>([
    { city: null, startDate: '', endDate: '' },
  ]);
  const [activeLegIndex, setActiveLegIndex] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [tripsRes, citiesRes] = await Promise.all([
          fetch('/api/trips'),
          fetch('/api/cities'),
        ]);
        if (!mounted) return;
        const tripsData = await tripsRes.json();
        const citiesData = await citiesRes.json();
        const loadedTrips: Trip[] = Array.isArray(tripsData?.trips) ? tripsData.trips : [];
        const loadedCities: City[] = Array.isArray(citiesData?.cities) ? citiesData.cities : [];
        const map: Record<string, City> = {};
        for (const c of loadedCities) map[c.slug] = c;
        setTrips(loadedTrips);
        setCitiesMap(map);
      } catch {
        if (mounted) setError('Failed to load trips.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  function handleTripClick(trip: Trip) {
    localStorage.setItem('tripPlanner:activeTripId', trip._id);
    router.push(`/trips/${trip.urlId}/planning`);
  }

  function handleCitySelect(city: SelectedCity) {
    setDraftLegs((prev) => {
      const next = [...prev];
      next[activeLegIndex] = { ...next[activeLegIndex], city };
      return next;
    });
    setPickerOpen(false);
  }

  function handleAddLeg() {
    setDraftLegs((prev) => [...prev, { city: null, startDate: '', endDate: '' }]);
  }

  function handleRemoveLeg(index: number) {
    setDraftLegs((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== index);
      return next;
    });
    if (activeLegIndex >= draftLegs.length - 1) {
      setActiveLegIndex(Math.max(0, draftLegs.length - 2));
    }
  }

  function updateLegDate(index: number, field: 'startDate' | 'endDate', value: string) {
    setDraftLegs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  const canCreate = draftLegs.some((l) => l.city !== null);

  async function handleCreate() {
    const validLegs = draftLegs.filter((l) => l.city !== null);
    if (!validLegs.length || creating) return;

    setCreating(true);
    setError('');

    try {
      const today = new Date();
      const defaultStart = today.toISOString().slice(0, 10);
      const defaultEnd = new Date(today.getTime() + 3 * 86400000).toISOString().slice(0, 10);

      const legs = validLegs.map((l) => ({
        cityId: l.city!.slug,
        startDate: l.startDate || defaultStart,
        endDate: l.endDate || defaultEnd,
      }));

      const cityMeta: Record<string, any> = {};
      for (const l of validLegs) {
        const c = l.city!;
        cityMeta[c.slug] = {
          name: c.name,
          timezone: c.timezone,
          locale: c.locale,
          mapCenter: c.mapCenter,
          mapBounds: c.mapBounds,
        };
      }

      const name = validLegs.length === 1
        ? validLegs[0].city!.name
        : validLegs.map((l) => l.city!.name).join(' → ');

      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, legs, cityMeta }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create trip.');
      const newTrip = data.trip;
      localStorage.setItem('tripPlanner:activeTripId', newTrip._id);
      router.push(`/trips/${newTrip.urlId}/planning`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trip.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-dvh h-dvh flex flex-col w-full overflow-hidden" style={{ background: '#0A0A0A' }}>
      {/* Top Bar */}
      <header
        className="flex items-center justify-between px-6 min-h-[52px] shrink-0"
        style={{ background: '#080808', borderBottom: '1px solid #1E1E1E' }}
      >
        <div className="flex items-center gap-6 h-full">
          <span
            className="text-[15px] font-bold tracking-wide text-[#F5F5F5]"
            style={{ fontFamily: sans, letterSpacing: 1 }}
          >
            TRIP PLANNER
          </span>
          <div className="flex items-center h-full">
            <div className="flex items-center gap-1.5 h-full px-3 relative" style={{ color: '#00E87B' }}>
              <Map size={14} />
              <span
                className="text-[11px] font-semibold uppercase"
                style={{ fontFamily: mono, letterSpacing: 0.5 }}
              >
                TRIPS
              </span>
              <div className="absolute bottom-0 left-3 right-3 h-0.5" style={{ background: '#00E87B' }} />
            </div>
          </div>
        </div>
        <Avatar name="P" />
      </header>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-16 py-12 max-sm:px-4 max-sm:py-6">
          {/* Title */}
          <div className="flex flex-col gap-2 mb-8">
            <h1
              className="m-0"
              style={{ fontFamily: sans, fontSize: 32, fontWeight: 600, color: '#F5F5F5', letterSpacing: -1 }}
            >
              Your Trips
            </h1>
            <p className="m-0" style={{ fontFamily: mono, fontSize: 12, color: '#525252' }}>
              Plan multi-city itineraries across any destination
            </p>
          </div>

          {/* Trip Builder */}
          <div
            className="w-full max-w-[680px] mx-auto mb-10"
            style={{ background: '#111111', border: '1px solid #1E1E1E' }}
          >
            {draftLegs.map((leg, legIndex) => {
              const color = LEG_COLORS[legIndex % LEG_COLORS.length];
              const isLast = legIndex === draftLegs.length - 1;
              return (
                <div key={legIndex}>
                  <div className="flex items-stretch">
                    {/* Leg indicator */}
                    <div
                      className="flex flex-col items-center pt-5 pb-3 shrink-0"
                      style={{ width: 48 }}
                    >
                      <div
                        className="flex items-center justify-center shrink-0"
                        style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: `${color}20`, border: `1.5px solid ${color}`,
                        }}
                      >
                        <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color }}>{legIndex + 1}</span>
                      </div>
                      {!isLast && (
                        <div className="flex-1 mt-1.5" style={{ width: 1.5, background: `${color}30` }} />
                      )}
                    </div>

                    {/* Leg content */}
                    <div className="flex-1 flex items-center gap-0 py-3 pr-3 min-w-0">
                      {/* City picker */}
                      <button
                        type="button"
                        className="flex items-center gap-2.5 flex-1 min-w-0 h-10 px-3 bg-transparent border-none cursor-pointer text-left transition-colors hover:bg-[#1A1A1A]"
                        onClick={() => { setActiveLegIndex(legIndex); setPickerOpen(true); }}
                      >
                        <Search size={13} style={{ color: '#525252', flexShrink: 0 }} />
                        <span
                          className="truncate"
                          style={{
                            fontFamily: mono, fontSize: 13,
                            color: '#F5F5F5',
                            fontWeight: leg.city ? 500 : 400,
                          }}
                        >
                          {leg.city ? leg.city.name : 'Search destinations'}
                        </span>
                      </button>

                      {/* Divider */}
                      <div className="shrink-0 mx-1" style={{ width: 1, height: 24, background: '#222' }} />

                      {/* Date range */}
                      <div className="shrink-0">
                        <DateRangePicker
                          startDate={leg.startDate}
                          endDate={leg.endDate}
                          onChange={(s, e) => {
                            updateLegDate(legIndex, 'startDate', s);
                            updateLegDate(legIndex, 'endDate', e);
                          }}
                          startPlaceholder="Start"
                          endPlaceholder="End"
                        />
                      </div>

                      {/* Remove leg */}
                      {draftLegs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLeg(legIndex)}
                          className="flex items-center justify-center shrink-0 bg-transparent border-none cursor-pointer ml-1 transition-colors hover:bg-[#1A1A1A]"
                          style={{ width: 28, height: 28 }}
                        >
                          <X size={12} style={{ color: '#525252' }} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Row separator */}
                  {!isLast && (
                    <div style={{ height: 1, background: '#1A1A1A', marginLeft: 48 }} />
                  )}
                </div>
              );
            })}

            {/* Add city + Create row */}
            <div
              className="flex items-center justify-between px-3 py-2.5"
              style={{ borderTop: '1px solid #1A1A1A' }}
            >
              <button
                type="button"
                onClick={handleAddLeg}
                className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer px-2 py-1.5 transition-colors hover:bg-[#1A1A1A]"
              >
                <Plus size={12} style={{ color: '#00E87B' }} />
                <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, color: '#00E87B', letterSpacing: 0.5 }}>
                  ADD CITY
                </span>
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!canCreate || creating}
                className="flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-none px-5 py-2 transition-opacity"
                style={{ background: '#00E87B' }}
              >
                {creating ? (
                  <Loader2 size={14} className="animate-spin" style={{ color: '#0A0A0A' }} />
                ) : (
                  <ArrowRight size={14} style={{ color: '#0A0A0A' }} />
                )}
                <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: '#0A0A0A', letterSpacing: 0.5 }}>
                  {creating ? 'CREATING...' : 'CREATE TRIP'}
                </span>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: '#1E1E1E', margin: '0 0 24px' }} />

          {/* Section Label */}
          <span
            className="block mb-5"
            style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: '#666', letterSpacing: 1.5 }}
          >
            RECENT TRIPS
          </span>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin" style={{ color: '#525252' }} />
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="text-center py-20">
              <p style={{ fontFamily: mono, fontSize: 12, color: '#EF4444' }}>{error}</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && trips.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Map size={32} style={{ color: '#525252' }} />
              <p style={{ fontFamily: mono, fontSize: 12, color: '#525252' }}>
                No trips yet. Search a destination above to get started!
              </p>
            </div>
          )}

          {/* Trip Grid */}
          {!loading && !error && trips.length > 0 && (
            <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
              {trips.map((trip) => {
                const { start, end } = getTripDateRange(trip.legs);
                const subtitle = getTripSubtitle(trip.legs, citiesMap);
                const tripName = trip.name || trip.legs.map((l) => getCityDisplayName(l.cityId, citiesMap)).join(' → ');

                return (
                  <button
                    key={trip._id}
                    type="button"
                    onClick={() => handleTripClick(trip)}
                    className="text-left cursor-pointer transition-all duration-200 bg-transparent border-none p-0 group"
                    style={{ outline: 'none' }}
                  >
                    <div
                      className="flex flex-col overflow-hidden transition-colors duration-200"
                      style={{ background: '#111111', border: '1px solid #1E1E1E' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#00E87B'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E1E1E'; }}
                    >
                      {/* Cover */}
                      <div
                        className="relative flex items-end p-4"
                        style={{
                          height: 100,
                          background: getCoverGradient(trip.legs),
                        }}
                      >
                        <div className="absolute inset-0 opacity-20" style={{
                          backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.08), transparent 60%)',
                        }} />
                      </div>

                      {/* Content */}
                      <div className="flex flex-col gap-3 p-5">
                        <div className="flex flex-col gap-1">
                          <span
                            className="text-lg font-semibold text-[#F5F5F5]"
                            style={{ fontFamily: sans, letterSpacing: -0.5 }}
                          >
                            {tripName}
                          </span>
                          {subtitle && (
                            <span className="text-[11px]" style={{ fontFamily: mono, color: '#00E87B' }}>
                              {subtitle}
                            </span>
                          )}
                          {start && end && (
                            <span className="text-[11px]" style={{ fontFamily: mono, color: '#525252' }}>
                              {formatTripDateRange(start, end)}
                            </span>
                          )}
                        </div>

                        {/* Leg badges */}
                        {trip.legs.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {trip.legs.map((leg, i) => {
                              const color = LEG_COLORS[i % LEG_COLORS.length];
                              return (
                                <span
                                  key={`${leg.cityId}-${i}`}
                                  className="flex items-center gap-1 text-[9px] font-semibold uppercase px-2 py-1"
                                  style={{
                                    fontFamily: mono,
                                    color,
                                    background: `${color}18`,
                                    border: `1px solid ${color}40`,
                                  }}
                                >
                                  <MapPin size={8} />
                                  {getCityDisplayName(leg.cityId, citiesMap)}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Create New Trip Placeholder */}
              <button
                type="button"
                onClick={() => { setActiveLegIndex(0); setPickerOpen(true); }}
                className="flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors hover:border-[#3a3a3a] bg-transparent"
                style={{ border: '1px solid #262626', borderStyle: 'dashed', height: 220, padding: 20 }}
              >
                <Plus size={24} style={{ color: '#525252' }} />
                <span className="text-xs font-medium" style={{ fontFamily: mono, color: '#525252' }}>
                  Create new trip
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      <CityPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleCitySelect}
      />
    </main>
  );
}
