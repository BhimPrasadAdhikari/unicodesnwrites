'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

import { useAnalytics } from '@/hooks/useAnalytics';

export function RouteAnalytics() {
  const pathname = usePathname();
  const previousPath = useRef<string | null>(null);
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    if (!pathname || previousPath.current === pathname) return;
    previousPath.current = pathname;
    trackEvent('page_view', { title: document.title });
  }, [pathname, trackEvent]);

  return null;
}
