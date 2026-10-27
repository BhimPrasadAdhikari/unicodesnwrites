'use client';

import Link from 'next/link';
import { 
  ArrowRight, 
  Zap, 
  TrendingUp,
  FileText, 
  Mail, 
  Download, 
  ShoppingBag, 
  Share2, 
  MessageSquare, 
  Search, 
  MousePointer2,
  Code
} from 'lucide-react';
import { useEffect, useState } from 'react';

const EVENT_ICON_MAP: Record<string, React.ReactNode> = {
  blog_view: <FileText className="h-4 w-4" />,
  newsletter_signup: <Mail className="h-4 w-4" />,
  resume_download: <Download className="h-4 w-4" />,
  product_view: <ShoppingBag className="h-4 w-4" />,
  social_link_click: <Share2 className="h-4 w-4" />,
  contact_form_submit: <MessageSquare className="h-4 w-4" />,
  project_filter: <Search className="h-4 w-4" />,
  cta_button_click: <MousePointer2 className="h-4 w-4" />,
  code_walkthrough_open: <Code className="h-4 w-4" />,
};

const getEventIcon = (name: string) => {
  return EVENT_ICON_MAP[name] || <Zap className="h-4 w-4" />;
};

interface EventMetric {
  name: string;
  count: number;
  change: number;
  icon: string;
}

export default function EventsMetricsCard() {
  const [events, setEvents] = useState<EventMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEvents, setTotalEvents] = useState(0);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch('/api/analytics/events?range=7days&limit=5');
        if (!res.ok) throw new Error('Events request failed');
        const json = await res.json();
        
        if (json.events) {
          setEvents(json.events);
          setTotalEvents(json.total || 0);
        }
      } catch (e) {
        console.error('Failed to fetch events:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full min-h-[420px] flex-col rounded-xl border border-border bg-card p-6">
        <div className="animate-pulse space-y-5">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div className="space-y-2">
              <div className="h-4 w-32 rounded-md bg-muted/70" />
              <div className="h-3 w-20 rounded-md bg-muted/40" />
            </div>
            <div className="h-8 w-8 rounded-lg bg-muted/50" />
          </div>
          <div className="space-y-2">
            <div className="h-8 w-28 rounded-md bg-muted/80" />
            <div className="h-3 w-20 rounded-md bg-muted/40" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted/60" />
                  <div className="h-3.5 w-32 rounded bg-muted/70" />
                </div>
                <div className="h-4 w-12 rounded bg-muted/60" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[420px] flex-col justify-between rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:border-border">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Tracked Platform Events</h3>
              <p className="text-xs text-muted-foreground">User actions in the last 7 days</p>
            </div>
          </div>
          <Link
            href="/dashboard/analytics#events"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <span>All events</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Total Events Counter Banner */}
        <div className="mt-5 flex items-baseline justify-between rounded-xl border border-border bg-muted/20 px-4 py-3">
          <div>
            <span className="text-2xl font-serif font-medium tracking-[-0.02em] text-foreground">{totalEvents.toLocaleString()}</span>
            <span className="ml-2 text-xs text-muted-foreground">total actions captured</span>
          </div>
          <span className="rounded-lg bg-secondary px-2.5 py-0.5 text-xs font-semibold text-foreground">
            Active stream
          </span>
        </div>

        {/* Top Events List */}
        <div className="mt-4 space-y-2.5">
          {events.length > 0 ? (
            events.map((event, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 p-2.5 transition hover:border-border/80 hover:bg-muted/40"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
                    {getEventIcon(event.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold capitalize text-foreground truncate">
                      {event.name.replace(/_/g, ' ')}
                    </p>
                    <p className="text-2xs text-muted-foreground font-mono truncate">
                      event: {event.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <span className="text-sm font-bold text-foreground">
                    {event.count.toLocaleString()}
                  </span>
                  {event.change !== undefined && event.change > 0 && (
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-success/10 px-2 py-0.5 text-2xs font-medium text-success">
                      <TrendingUp className="h-2.5 w-2.5" />
                      +{event.change}%
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No recent events tracked for this period
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border/50 text-right">
        <Link
          href="/dashboard/analytics/help"
          className="text-2xs font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          Learn how events are collected →
        </Link>
      </div>
    </div>
  );
}
