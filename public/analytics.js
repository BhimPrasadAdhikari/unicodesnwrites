/**
 * Custom Analytics Tracking Script
 * 
 * Features:
 * - Page view tracking with time on page and scroll depth
 * - Session and visitor management via localStorage/sessionStorage
 * - UTM parameter parsing
 * - Click tracking (buttons, external links)
 * - Custom event support
 * - Respects Do Not Track (DNT)
 * - Lightweight (< 5KB)
 */

(function() {
  'use strict';
  
  // Configuration
  const TRACK_ENDPOINT = '/api/analytics/track';
  const PENDING_KEY = 'analytics_pending_v1';
  
  // Check DNT (Do Not Track)
  if (navigator.doNotTrack === '1') {
    window.__analyticsQueue = [];
    window.trackEvent = function() {};
    console.log('[Analytics] DNT enabled, tracking disabled');
    return;
  }
  
  // State
  let startTime = Date.now();
  let maxScroll = 0;
  
  // Generate visitor fingerprint (simple hash of browser characteristics)
  function generateFingerprint() {
    const data = [
      navigator.userAgent,
      navigator.language,
      screen.colorDepth,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset()
    ].join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'v_' + Math.abs(hash).toString(36);
  }
  
  // Generate or retrieve session ID
  function getSessionId() {
    try {
      let sessionId = sessionStorage.getItem('analytics_session');
      if (!sessionId) {
        sessionId = 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('analytics_session', sessionId);
      }
      return sessionId;
    } catch {
      // Handle cookies disabled or quota exceeded
      return 's_incognito_' + Date.now();
    }
  }
  
  // Get visitor ID (persistent across sessions)
  function getVisitorId() {
    try {
      let visitorId = localStorage.getItem('analytics_visitor');
      if (!visitorId) {
        visitorId = generateFingerprint();
        localStorage.setItem('analytics_visitor', visitorId);
      }
      return visitorId;
    } catch {
      return generateFingerprint();
    }
  }

  function createEventId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 12);
  }

  function readPending() {
    try {
      const value = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
      return Array.isArray(value) ? value.slice(-50) : [];
    } catch {
      return [];
    }
  }

  function writePending(events) {
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify(events.slice(-50)));
    } catch {}
  }

  function queuePending(data) {
    const pending = readPending();
    if (!pending.some((item) => item && item.eventId === data.eventId)) pending.push(data);
    writePending(pending);
  }

  async function deliver(data) {
    try {
      const response = await fetch(TRACK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true
      });
      if (!response.ok) throw new Error('Analytics endpoint rejected the event');
    } catch {
      queuePending(data);
    }
  }

  function flushPending() {
    const pending = readPending();
    if (!pending.length) return;
    writePending([]);
    pending.forEach(deliver);
  }
  
  // Parse UTM parameters from URL
  function getUtmParams() {
    try {
      const params = new URLSearchParams(window.location.search);
      return {
        utmSource: params.get('utm_source') || undefined,
        utmMedium: params.get('utm_medium') || undefined,
        utmCampaign: params.get('utm_campaign') || undefined,
        utmContent: params.get('utm_content') || undefined,
        utmTerm: params.get('utm_term') || undefined
      };
    } catch {
      return {};
    }
  }
  
  // Track event
  function track(event, metadata = {}) {
    const data = {
      eventId: createEventId(),
      event,
      sessionId: getSessionId(),
      visitorId: getVisitorId(),
      page: window.location.pathname,
      referrer: document.referrer || undefined,
      ...getUtmParams(),
      metadata,
      timestamp: new Date().toISOString()
    };
    
    void deliver(data);
  }
  
  // Track page view
  function trackPageView() {
    startTime = Date.now();
    maxScroll = 0;
  }

  function updateScrollDepth() {
    const pageHeight = document.documentElement.scrollHeight;
    if (!pageHeight) return;
    const scrollPercent = Math.min(100, Math.round(
      (window.scrollY + window.innerHeight) / pageHeight * 100
    ));
    if (scrollPercent > maxScroll) {
      maxScroll = scrollPercent;
    }
  }

  function trackPageExit() {
    const duration = Math.round((Date.now() - startTime) / 1000);
    if (duration > 0) {
      track('page_exit', {
        duration,
        scrollDepth: maxScroll
      });
    }
  }
  
  // Track clicks on specific elements
  function trackClicks() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('a, button');
      if (!target) return;
      
      // Track button clicks
      if (target.tagName === 'BUTTON' || target.getAttribute('role') === 'button') {
        track('button_click', {
          buttonId: target.id || undefined,
          buttonText: target.textContent.trim().substring(0, 50),
          buttonClass: target.className
        });
      }
      
      // Track external link clicks
      if (target.tagName === 'A' && target.href) {
        try {
          const isExternal = target.hostname !== window.location.hostname;
          if (isExternal) {
            track('external_link_click', {
              url: target.href,
              text: target.textContent.trim().substring(0, 50)
            });
          }
        } catch {
          // Ignore invalid URLs
        }
      }
    }, true);
  }
  
  // Handle visibility change (tab switch) and unload
  function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      trackPageExit();
    } else {
      // Reset timer when coming back
      startTime = Date.now();
    }
  }
  
  // Initialize tracking
  try {
    flushPending();
    // Initial page view
    trackPageView();
    updateScrollDepth();
    window.addEventListener('scroll', updateScrollDepth, { passive: true });
    
    // Setup click tracking
    trackClicks();
    
    // Handle visibility changes/unload
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Handle SPA navigation (if needed, though Next.js App Router does full reloads often, 
    // but for soft navigation we might need to hook into history)
    // For now, relying on Next.js standard navigation which usually triggers layout re-renders or checks.
    // If using <Link>, we might need to listen to history changes.
    // However, since this script is in layout, it runs once.
    // We need to patch history for SPA support.
    
    const originalPushState = history.pushState;
    history.pushState = function() {
      trackPageExit();
      originalPushState.apply(this, arguments);
      setTimeout(trackPageView, 100); // Start new page session
    };
    
    const originalReplaceState = history.replaceState;
    history.replaceState = function() {
      originalReplaceState.apply(this, arguments);
      // Replace usually doesn't mean new page view, but can be updates.
    };
    
    window.addEventListener('popstate', () => {
      trackPageExit();
      setTimeout(trackPageView, 100);
    });
    
  } catch (e) {
    console.error('Analytics init failed', e);
  }
  
  // Expose global tracking function for custom events
  const queuedEvents = Array.isArray(window.__analyticsQueue) ? window.__analyticsQueue.slice(-100) : [];
  window.__analyticsQueue = [];
  window.trackEvent = function(eventName, metadata) {
    track(eventName, metadata);
  };
  queuedEvents.forEach(function(item) {
    if (Array.isArray(item) && typeof item[0] === 'string') track(item[0], item[1]);
  });
  
})();
