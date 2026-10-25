import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/config/auth';
import AnalyticsWidget from '@/components/cms/AnalyticsWidget';
import EventsMetricsCard from '@/components/cms/EventsMetricsCard';
import OverviewMetricsCards from '@/components/cms/OverviewMetricsCards';
import OverviewPulse from '@/components/cms/OverviewPulse';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, ExternalLink, Layers } from 'lucide-react';
import { Glyph, type GlyphKind } from '@/components/ui/Glyph';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Overview | Admin Dashboard',
  description: 'Admin command center and live telemetry',
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login?reauth=1');
  }

  if (session.user?.role !== 'admin') {
    redirect('/');
  }

  const quickActions: { label: string; href: string; glyph?: GlyphKind; icon?: typeof BarChart3 }[] = [
    { label: 'New post', href: '/dashboard/posts/new', glyph: 'papers' },
    { label: 'New series', href: '/dashboard/series/new', icon: Layers },
    { label: 'New course', href: '/dashboard/courses/new', glyph: 'courses' },
    { label: 'New issue', href: '/dashboard/newsletters/new', glyph: 'letters' },
    { label: 'New tool', href: '/dashboard/products/new', glyph: 'tools' },
    { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  ];

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        eyebrow="Studio · Overview"
        title={`Good to see you, ${session.user?.name?.split(' ')[0] || 'Admin'}.`}
        description="Publishing, readers, subscribers and revenue at a glance."
        action={(
          <Link
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-foreground px-4 text-sm font-medium text-foreground transition hover:bg-secondary"
          >
            <ExternalLink className="h-4 w-4" />
            View live site
          </Link>
        )}
      />

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
        {quickActions.map(({ label, href, glyph, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex min-h-[88px] flex-col items-start justify-between gap-3 bg-card p-4 transition-colors hover:bg-secondary/60"
          >
            {glyph ? <Glyph kind={glyph} size={26} className="group-hover:text-primary" /> : Icon ? <Icon className="h-5 w-5 group-hover:text-primary" /> : null}
            <span className="text-sm font-medium text-foreground">{label}</span>
          </Link>
        ))}
      </div>

      {/* Top-level Key Performance Metrics */}
      <OverviewMetricsCards />

      {/* What needs you, 30-day trends and the most-read posts */}
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl border border-border bg-card" aria-label="Loading trends" />}>
        <OverviewPulse />
      </Suspense>

      {/* Analytics & Custom Events Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsWidget />
        <EventsMetricsCard />
      </div>
    </div>
  );
}
