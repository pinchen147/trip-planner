export interface TripLeg {
  city: string;
  timezone: string;
  color: string;
  startDate: string;
  endDate: string;
}

export interface MockTrip {
  id: string;
  name: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  eventsCount: number;
  spotsCount: number;
  isActive: boolean;
  subtitle?: string;
  legs: TripLeg[];
}

export const MOCK_TRIPS: MockTrip[] = [
  {
    id: 'trip-sf',
    name: 'San Francisco',
    imageUrl: 'https://images.unsplash.com/photo-1760210087187-12256d8056e2?w=600&q=80',
    startDate: '2026-02-07',
    endDate: '2026-02-10',
    eventsCount: 14,
    spotsCount: 23,
    isActive: true,
    legs: [
      { city: 'San Francisco', timezone: 'America/Los_Angeles', color: '#00E87B', startDate: '2026-02-07', endDate: '2026-02-10' },
    ],
  },
  {
    id: 'trip-london-paris',
    name: 'London \u2192 Paris',
    imageUrl: 'https://images.unsplash.com/photo-1674073088954-c7724a624d61?w=600&q=80',
    startDate: '2026-03-01',
    endDate: '2026-03-08',
    eventsCount: 22,
    spotsCount: 18,
    isActive: false,
    subtitle: 'Multi-leg \u00b7 2 cities \u00b7 GMT / CET',
    legs: [
      { city: 'London', timezone: 'Europe/London', color: '#3B82F6', startDate: '2026-03-01', endDate: '2026-03-05' },
      { city: 'Paris', timezone: 'Europe/Paris', color: '#A855F7', startDate: '2026-03-05', endDate: '2026-03-08' },
    ],
  },
];

export function formatTripDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${s.toLocaleDateString('en-US', opts)} \u2013 ${e.toLocaleDateString('en-US', opts)}`;
}
