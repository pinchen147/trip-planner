'use client';

import { useSyncExternalStore, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';

const CONSENT_KEY = 'cookie-consent';

function useNeedsConsent() {
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener('storage', cb);
    return () => window.removeEventListener('storage', cb);
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => !localStorage.getItem(CONSENT_KEY),
    () => false,
  );
}

export default function CookieConsent() {
  const needsConsent = useNeedsConsent();
  const [dismissed, setDismissed] = useState(false);
  const visible = needsConsent && !dismissed;

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setDismissed(true);
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setDismissed(true);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 px-6 py-3 bg-[#111111] border-t border-border text-foreground-secondary text-[0.82rem]">
      <p className="m-0">
        We use cookies for authentication and analytics.{' '}
        <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</a>
      </p>
      <div className="flex gap-2 shrink-0">
        <Button type="button" size="sm" variant="secondary" onClick={decline}>
          Decline
        </Button>
        <Button type="button" size="sm" onClick={accept}>
          Accept
        </Button>
      </div>
    </div>
  );
}
