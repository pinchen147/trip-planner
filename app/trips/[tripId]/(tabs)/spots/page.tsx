'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function SpotsRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;
    redirected.current = true;
    const target = pathname.replace(/\/spots(\/|$)/, '/sources$1');
    const qs = searchParams.toString();
    router.replace(qs ? `${target}?${qs}` : target);
  }, [router, pathname, searchParams]);

  return (
    <div className="flex-1 min-h-0 flex items-center justify-center text-muted text-sm">
      Redirecting...
    </div>
  );
}
