'use client';

import { useSyncExternalStore } from 'react';
import { Analytics } from '@vercel/analytics/next';

const CONSENT_KEY = 'cookie-consent';

function useHasConsent() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('storage', cb);
      return () => window.removeEventListener('storage', cb);
    },
    () => localStorage.getItem(CONSENT_KEY) === 'accepted',
    () => false,
  );
}

export default function ConsentAnalytics() {
  const hasConsent = useHasConsent();
  if (!hasConsent) return null;
  return <Analytics />;
}
