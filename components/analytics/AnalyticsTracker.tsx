"use client";

import { useEffect, useRef } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

interface AnalyticsTrackerProps {
  event: string;
  metadata?: Record<string, unknown>;
}

export default function AnalyticsTracker({ event, metadata }: AnalyticsTrackerProps) {
  const { trackEvent } = useAnalytics();
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackEvent(event, metadata);
  }, [event, metadata, trackEvent]);

  return null;
}
