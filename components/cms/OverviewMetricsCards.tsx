'use client';

import { useEffect, useState } from 'react';
import { DollarSign, ShoppingBag, Users, Eye, TrendingUp, TrendingDown, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

interface DashboardStats {
  revenue: {
    valueCents: number;
    formatted: string;
    change: number | null;
  };
  sales: {
    value: number;
    change: number | null;
  };
  subscribers: {
    value: number;
    total: number;
    change: number | null;
  };
  views: {
    value: number;
    articles: number;
    change: number | null;
  };
}

export function OverviewMetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-xl border border-border bg-card p-5"
        >
          <div className="animate-pulse space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 rounded-full bg-muted/60" />
              <div className="h-9 w-9 rounded-xl bg-muted/50" />
            </div>
            <div className="h-8 w-32 rounded-lg bg-muted/80" />
            <div className="flex items-center gap-2 pt-1">
              <div className="h-3 w-12 rounded-full bg-muted/50" />
              <div className="h-3 w-20 rounded-full bg-muted/40" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OverviewMetricsCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return <OverviewMetricsSkeleton />;
  }

  if (!stats) {
    return null;
  }

  const metricCards = [
    {
      title: 'Total Revenue',
      value: stats.revenue?.formatted ?? '$0.00',
      subtitle: 'From digital products & sales',
      change: stats.revenue?.change ?? 0,
      icon: DollarSign,
      color: 'emerald',
      bgGlow: 'bg-success/10 text-success border-success/20',
      badgeBg: 'bg-success/10 text-success',
    },
    {
      title: 'Total Sales',
      value: (stats.sales?.value ?? 0).toLocaleString(),
      subtitle: 'Completed product orders',
      change: stats.sales?.change ?? 0,
      icon: ShoppingBag,
      color: 'violet',
      bgGlow: 'bg-secondary text-foreground border-border',
      badgeBg: 'bg-secondary text-foreground',
    },
    {
      title: 'Subscribers',
      value: (stats.subscribers?.value ?? 0).toLocaleString(),
      subtitle: 'Confirmed newsletter readers',
      change: stats.subscribers?.change ?? 0,
      icon: Users,
      color: 'cyan',
      bgGlow: 'bg-accent/10 text-accent border-accent/20',
      badgeBg: 'bg-accent/10 text-accent',
    },
    {
      title: 'Total Views',
      value: (stats.views?.value ?? 0).toLocaleString(),
      subtitle: `${stats.views?.articles ?? 0} published articles`,
      change: stats.views?.change ?? 0,
      icon: Eye,
      color: 'amber',
      bgGlow: 'bg-warning/10 text-warning border-warning/20',
      badgeBg: 'bg-warning/10 text-warning',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metricCards.map((card) => {
        const Icon = card.icon;
        const hasComparison = card.change !== null;
        const isPositive = (card.change ?? 0) >= 0;

        return (
          <Card
            key={card.title}
            className="relative overflow-hidden rounded-xl border border-border bg-card p-5"
          >
            <CardContent className="p-0 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[12px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  {card.title}
                </span>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary text-foreground`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <div>
                <div className="font-serif text-[32px] font-medium leading-none tracking-[-0.02em] text-foreground sm:text-[36px]">
                  {card.value}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {card.subtitle}
                </p>
              </div>

              <div className="flex items-center gap-1.5 pt-1 text-xs font-medium">
                {hasComparison ? (
                  <>
                    <span className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 font-mono text-[12px] font-medium ${card.badgeBg}`}>
                      {isPositive ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {isPositive ? `+${card.change}%` : `${card.change}%`}
                    </span>
                    <span className="text-2xs text-muted-foreground">vs last month</span>
                  </>
                ) : (
                  <span className="text-2xs text-muted-foreground">No baseline data yet</span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
