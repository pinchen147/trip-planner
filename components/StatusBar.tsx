'use client';

import { useState, useEffect } from 'react';
import { useTrip } from '@/components/providers/TripProvider';

function formatSyncAge(lastSyncAt: number | null): string {
  if (!lastSyncAt) return 'Not synced yet';
  const seconds = Math.max(0, Math.round((Date.now() - lastSyncAt) / 1000));
  if (seconds < 5) return 'Last sync: just now';
  if (seconds < 60) return `Last sync: ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Last sync: ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `Last sync: ${hours}h ${minutes % 60}m ago`;
}

export default function StatusBar() {
  const { status, statusError, lastSyncAt, routeSummary } = useTrip();
  const [syncLabel, setSyncLabel] = useState(() => formatSyncAge(lastSyncAt));

  useEffect(() => {
    setSyncLabel(formatSyncAge(lastSyncAt));
    if (!lastSyncAt) return;
    const interval = setInterval(() => setSyncLabel(formatSyncAge(lastSyncAt)), 10_000);
    return () => clearInterval(interval);
  }, [lastSyncAt]);

  return (
    <div
      className="flex items-center justify-between px-4 shrink-0"
      style={{
        background: '#080808',
        borderTop: '1px solid var(--color-border)',
        height: 28,
        fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
        fontSize: 10,
      }}
      role="status"
    >
      <div className="flex items-center gap-2">
        <span
          className="shrink-0"
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: statusError ? '#FF4444' : '#00E87B',
            boxShadow: statusError ? '0 0 6px rgba(255,68,68,0.4)' : undefined,
          }}
        />
        <span style={{ color: statusError ? '#FF4444' : '#666' }}>{status}</span>
      </div>
      <div className="flex items-center gap-4">
        <span style={{ color: '#444' }}>{syncLabel}</span>
        {routeSummary ? (
          <span style={{ color: '#666' }}>{routeSummary}</span>
        ) : null}
      </div>
    </div>
  );
}
