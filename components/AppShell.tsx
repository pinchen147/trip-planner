'use client';

import type React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import MapPanel from '@/components/MapPanel';
import StatusBar from '@/components/StatusBar';
import TripSelector from '@/components/TripSelector';
import { useTrip } from '@/components/providers/TripProvider';
import Link from 'next/link';
import {
  Calendar, Compass, LayoutGrid, Navigation, RefreshCw, Settings
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'planning', icon: Navigation, label: 'PLANNING' },
  { id: 'sources', icon: Compass, label: 'SOURCES' },
  { id: 'calendar', icon: Calendar, label: 'CALENDAR' },
  { id: 'config', icon: Settings, label: 'CONFIG' }
];

const MAP_TABS = new Set(['planning']);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    isSyncing, handleSync, canManageGlobal, currentTripUrlId
  } = useTrip();

  const segments = pathname.split('/');
  // /trips/{urlId}/{tab} → tab is segments[3]
  const activeId = segments[3] || 'planning';
  const showMap = MAP_TABS.has(activeId);
  const hasMapSidebar = activeId !== 'map' && showMap;
  const canSync = canManageGlobal;

  return (
    <main className="min-h-dvh h-dvh flex flex-col w-full overflow-hidden">
      <header className="flex items-center justify-between px-6 h-[52px] min-h-[52px] border-b border-border bg-[#080808] relative z-30 topbar-responsive">
        <div className="flex items-center gap-5 h-full">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-[15px] font-bold tracking-wide text-[#F5F5F5] shrink-0 no-underline hover:text-[#00E87B] transition-colors"
            style={{ fontFamily: "var(--font-space-grotesk, 'Space Grotesk', sans-serif)", letterSpacing: 1 }}
          >
            <LayoutGrid size={14} className="text-[#525252]" />
            TRIP PLANNER
          </Link>
          <nav className="flex items-center h-full overflow-x-auto scrollbar-none topbar-nav-responsive" aria-label="App navigator">
            {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
              const href = `/trips/${currentTripUrlId}/${id}`;
              const isActive = activeId === id;
              return (
                <button
                  key={id}
                  type="button"
                  className="relative inline-flex items-center gap-1.5 h-full px-3.5 border-none rounded-none cursor-pointer transition-all duration-200 whitespace-nowrap shrink-0 topbar-nav-item-responsive bg-transparent"
                  style={{
                    fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
                    fontSize: 11,
                    fontWeight: isActive ? 600 : 500,
                    letterSpacing: 0.5,
                    color: isActive ? '#00E87B' : '#525252',
                  }}
                  onClick={() => router.push(href)}
                >
                  <Icon size={13} />
                  {label}
                  {isActive && (
                    <div className="absolute bottom-0 left-3 right-3 h-0.5" style={{ background: '#00E87B' }} />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3 shrink-0 topbar-actions-responsive">
          {/* Trip / City Selector — hidden on mobile via CSS */}
          <div className="topbar-trip-selector">
            <TripSelector />
          </div>
          {/* Sync Button */}
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing || !canSync}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-transparent transition-colors"
            style={{
              background: '#111111',
              border: '1px solid #262626',
              fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
              fontSize: 10,
              fontWeight: 500,
              color: '#525252',
            }}
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            SYNC
          </button>
        </div>
      </header>
      <div className={`min-h-0 flex-1 grid items-stretch ${hasMapSidebar ? 'layout-sidebar grid-cols-[minmax(0,3fr)_5fr]' : showMap ? 'grid-cols-1' : ''}`} style={showMap ? undefined : { display: 'contents' }}>
        <div className={showMap ? 'map-panel-shell min-h-0' : ''} style={showMap ? undefined : { position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden={!showMap}>
          <MapPanel />
        </div>
        {children}
      </div>
      <StatusBar />
    </main>
  );
}
