"use client";

import Link from 'next/link';
import { ArrowRight, Users, Eye, TrendingUp, TrendingDown, Clock, Activity, BarChart3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';

export default function AnalyticsWidget() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [res, timelineRes] = await Promise.all([
          fetch('/api/analytics/overview?range=7days'),
          fetch('/api/analytics/traffic-timeline?range=7days'),
        ]);
        // A 401 or 500 must not render as a week of zeros.
        if (!res.ok || !timelineRes.ok) throw new Error('Analytics request failed');
        const [json, timelineJson] = await Promise.all([res.json(), timelineRes.json()]);
        
        setData({
          ...json,
          timeline: timelineJson.timeline || []
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full min-h-[420px] flex-col rounded-xl border border-border bg-card p-6">
        <div className="animate-pulse space-y-5">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div className="space-y-2">
              <div className="h-4 w-36 rounded-md bg-muted/70" />
              <div className="h-3 w-20 rounded-md bg-muted/40" />
            </div>
            <div className="h-8 w-8 rounded-lg bg-muted/50" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 rounded-xl border border-border/50 bg-muted/30 space-y-2">
                <div className="h-3 w-14 rounded bg-muted/60" />
                <div className="h-6 w-16 rounded bg-muted/80" />
                <div className="h-2.5 w-10 rounded bg-muted/40" />
              </div>
            ))}
          </div>
          <div className="h-40 w-full rounded-xl bg-muted/30" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Traffic couldn&apos;t load. Refresh to try again.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[420px] flex-col justify-between rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:border-border">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Traffic & Engagement</h3>
              <p className="text-xs text-muted-foreground">Last 7 days performance</p>
            </div>
          </div>
          <Link
            href="/dashboard/analytics"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <span>Full report</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* 4 Key Stat Pills */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Views */}
          <div className="rounded-xl border border-border bg-muted/25 p-3 transition hover:bg-muted/40">
            <div className="flex items-center gap-1.5 text-muted-foreground text-2xs uppercase tracking-wider font-semibold">
              <Eye className="h-3 w-3 text-muted-foreground" />
              <span>Views</span>
            </div>
            <div className="mt-1 text-xl font-serif font-medium tracking-[-0.02em] text-foreground">
              {data.views?.value?.toLocaleString() ?? '0'}
            </div>
            <div className={`mt-1 flex items-center gap-0.5 text-2xs font-semibold ${(data.views?.change ?? 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
              {(data.views?.change ?? 0) >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
              {Math.abs(data.views?.change ?? 0)}%
            </div>
          </div>

          {/* Visitors */}
          <div className="rounded-xl border border-border bg-muted/25 p-3 transition hover:bg-muted/40">
            <div className="flex items-center gap-1.5 text-muted-foreground text-2xs uppercase tracking-wider font-semibold">
              <Users className="h-3 w-3 text-accent" />
              <span>Visitors</span>
            </div>
            <div className="mt-1 text-xl font-serif font-medium tracking-[-0.02em] text-foreground">
              {data.visitors?.value?.toLocaleString() ?? '0'}
            </div>
            <div className={`mt-1 flex items-center gap-0.5 text-2xs font-semibold ${(data.visitors?.change ?? 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
              {(data.visitors?.change ?? 0) >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
              {Math.abs(data.visitors?.change ?? 0)}%
            </div>
          </div>

          {/* Bounce Rate */}
          <div className="rounded-xl border border-border bg-muted/25 p-3 transition hover:bg-muted/40">
            <div className="flex items-center gap-1.5 text-muted-foreground text-2xs uppercase tracking-wider font-semibold">
              <Activity className="h-3 w-3 text-warning" />
              <span>Bounce</span>
            </div>
            <div className="mt-1 text-xl font-serif font-medium tracking-[-0.02em] text-foreground">
              {data.bounceRate?.value ?? 0}%
            </div>
            <div className={`mt-1 flex items-center gap-0.5 text-2xs font-semibold ${(data.bounceRate?.change ?? 0) <= 0 ? 'text-success' : 'text-destructive'}`}>
              {(data.bounceRate?.change ?? 0) <= 0 ? <TrendingDown className="h-2.5 w-2.5" /> : <TrendingUp className="h-2.5 w-2.5" />}
              {Math.abs(data.bounceRate?.change ?? 0)}%
            </div>
          </div>

          {/* Avg Duration */}
          <div className="rounded-xl border border-border bg-muted/25 p-3 transition hover:bg-muted/40">
            <div className="flex items-center gap-1.5 text-muted-foreground text-2xs uppercase tracking-wider font-semibold">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span>Avg. Time</span>
            </div>
            <div className="mt-1 text-xl font-serif font-medium tracking-[-0.02em] text-foreground">
              {Math.floor((data.avgDuration?.value || 0) / 60)}m {Math.round((data.avgDuration?.value || 0) % 60)}s
            </div>
            <div className={`mt-1 flex items-center gap-0.5 text-2xs font-semibold ${(data.avgDuration?.change ?? 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
              {(data.avgDuration?.change ?? 0) >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
              {Math.abs(data.avgDuration?.change ?? 0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Sparkline chart */}
      <div className="mt-6 h-36 w-full -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.timeline} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="widgetColorViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary, #3b82f6)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--primary, #3b82f6)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--card)',
                color: 'var(--foreground)',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                fontSize: '12px',
              }}
              cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <Area
              type="monotone"
              dataKey="views"
              name="Page Views"
              stroke="var(--primary, #3b82f6)"
              fillOpacity={1}
              fill="url(#widgetColorViews)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
