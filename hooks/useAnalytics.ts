"use client";

import { useEffect, useCallback } from 'react';

declare global {
  interface Window {
    trackEvent?: (event: string, metadata?: Record<string, unknown>) => void;
    __analyticsQueue?: Array<[string, Record<string, unknown> | undefined]>;
  }
}

export function useAnalytics() {
  const trackEvent = useCallback((event: string, metadata?: Record<string, unknown>) => {
    if (typeof window === 'undefined' || window.navigator.doNotTrack === '1') return;
    if (window.trackEvent) {
      window.trackEvent(event, metadata);
    } else {
      const queue = window.__analyticsQueue || [];
      queue.push([event, metadata]);
      window.__analyticsQueue = queue.slice(-100);
    }
  }, []);

  return { trackEvent };
}
