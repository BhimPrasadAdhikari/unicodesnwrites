'use client';

import { useCallback } from 'react';
import { track } from '@vercel/analytics';

type EventName = 
  | 'resume_download'
  | 'cta_button_click'
  | 'social_link_click'
  | 'blog_view'
  | 'blog_scroll_progress'
  | 'blog_comment_submit'
  | 'newsletter_signup'
  | 'contact_form_submit'
  | 'product_view'
  | 'product_purchase'
  | 'project_filter'
  | 'code_walkthrough_open'
  | 'series_view'
  | 'custom_event';

interface EventData {
  location?: string;
  category?: string;
  value?: number | string;
  source?: string;
  [key: string]: any;
}

export function useEventTracker() {
  const trackEvent = useCallback((eventName: EventName, data?: EventData) => {
    try {
      track(eventName, {
        timestamp: new Date().toISOString(),
        ...data,
      });
    } catch (error) {
      console.error(`Failed to track event: ${eventName}`, error);
    }
  }, []);

  return { trackEvent };
}
