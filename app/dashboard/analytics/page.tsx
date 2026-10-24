"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Eye, 
  Users, 
  Clock, 
  TrendingDown, 
  Download, 
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import Link from 'next/link';
import MetricCard from '@/components/cms/MetricCard';
import DateRangePicker from '@/components/cms/DateRangePicker';
import TrafficLineChart from '@/components/cms/charts/TrafficLineChart';
import TrafficSourcesPieChart from '@/components/cms/charts/TrafficSourcesPieChart';
import DevicesPieChart from '@/components/cms/charts/DevicesPieChart';
import AnalyticsTable from '@/components/cms/AnalyticsTable';
import EventsTable from '@/components/cms/charts/EventsTable';
import ConversionFunnel from '@/components/cms/charts/ConversionFunnel';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import { Alert } from '@/components/ui/Alert';

interface OverviewMetrics {
  views: { value: number; change: number };
  visitors: { value: number; change: number };
  avgDuration: { value: number; change: number };
  bounceRate: { value: number; change: number };
}

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true);
      setError('');
      try {
        const query = searchParams.toString();
        const res = await fetch(`/api/analytics/overview?${query}`);
        if (!res.ok) throw new Error('Analytics could not be loaded.');
        const data = await res.json();
        if (data) {
          setMetrics(data);
        }
      } catch (error) {
        console.error('Failed to load metrics', error);
        setError(error instanceof Error ? error.message : 'Analytics could not be loaded.');
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, [searchParams]);

  // Format helper
  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.round(seconds % 60);
    return `${min}m ${sec}s`;
  };

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        eyebrow="Traffic & Performance"
        title="Analytics Overview"
        description="Monitor real-time visitors, reading behavior, inbound referral channels, and conversion funnels."
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/analytics/help"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <HelpCircle className="h-4 w-4" />
              <span>Guide</span>
            </Link>
            <a
              href="/api/analytics/export?format=csv&range=30days"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-foreground transition hover:bg-muted"
              target="_blank"
              rel="noreferrer"
            >
              <Download className="h-4 w-4 text-muted-foreground" />
              <span>Export CSV</span>
            </a>
            <DateRangePicker />
          </div>
        )}
      />

      {error && (
        <Alert variant="destructive" className="p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Analytics are temporarily unavailable</p>
            <p className="mt-1 opacity-80">{error}</p>
          </div>
        </Alert>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Page Views"
          value={metrics?.views?.value?.toLocaleString() || '0'}
          change={metrics?.views?.change}
          loading={loading}
          icon={<Eye className="h-5 w-5" />}
          variant="blue"
        />
        <MetricCard
          title="Unique Visitors"
          value={metrics?.visitors?.value?.toLocaleString() || '0'}
          change={metrics?.visitors?.change}
          loading={loading}
          icon={<Users className="h-5 w-5" />}
          variant="cyan"
        />
        <MetricCard
          title="Avg. Session Duration"
          value={formatTime(metrics?.avgDuration?.value || 0)}
          change={metrics?.avgDuration?.change}
          loading={loading}
          icon={<Clock className="h-5 w-5" />}
          variant="purple"
        />
        <MetricCard
          title="Bounce Rate"
          value={`${metrics?.bounceRate?.value ?? 0}%`}
          change={metrics?.bounceRate?.change}
          loading={loading}
          icon={<TrendingDown className="h-5 w-5" />}
          variant="warning"
        />
      </div>

      {/* Traffic Line Chart & Traffic Sources Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TrafficLineChart />
        </div>
        <div className="lg:col-span-1">
          <TrafficSourcesPieChart />
        </div>
      </div>

      {/* Devices & Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <DevicesPieChart />
        </div>
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnalyticsTable
            title="Top Pages"
            endpoint="/api/analytics/top-pages"
            columns={[{ label: 'Page', key: 'page' }, { label: 'Views', key: 'views' }]}
            mapData={(json) => json.pages?.map((p: any) => ({ label: p.page, value: p.views }))}
          />
          <AnalyticsTable
            title="Top Referrers"
            endpoint="/api/analytics/top-referrers"
            columns={[{ label: 'Source', key: 'referrer' }, { label: 'Views', key: 'views' }]}
            mapData={(json) => json.referrers?.map((r: any) => ({ label: r.referrer, value: r.views }))}
          />
          <AnalyticsTable
            title="Newsletter Sources"
            endpoint="/api/analytics/newsletter-sources"
            columns={[{ label: 'Source', key: 'source' }, { label: 'Confirmed', key: 'confirmed' }]}
            mapData={(json) => json.sources?.map((s: any) => ({ label: s.source, value: s.confirmed || 0 }))}
          />
          <AnalyticsTable
            title="Newsletter Conversion Pages"
            endpoint="/api/analytics/newsletter-pages"
            columns={[{ label: 'Page', key: 'page' }, { label: 'Subscribed', key: 'subscribed' }]}
            mapData={(json) => json.pages?.map((p: any) => ({ label: p.page, value: p.subscribed }))}
          />
        </div>
      </div>

      {/* Events Section */}
      <div id="events" className="space-y-4 pt-2">
        <div>
          <p className="text-eyebrow text-primary">Event Telemetry</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">Tracked Platform Events</h2>
          <p className="text-sm text-muted-foreground">Detailed log of user actions, form submissions, and link clicks.</p>
        </div>
        <EventsTable />
      </div>

      {/* Conversion Funnels */}
      <div className="space-y-4 pt-2">
        <div>
          <p className="text-eyebrow text-primary">Conversion Flow</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">User Conversion Funnels</h2>
          <p className="text-sm text-muted-foreground">Drop-off and step progression across key user conversion goals.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <ConversionFunnel type="newsletter" title="Newsletter Funnel" />
          <ConversionFunnel type="purchase" title="Purchase Funnel" />
          <ConversionFunnel type="contact" title="Contact Funnel" />
          <ConversionFunnel type="course" title="Course Funnel" />
        </div>
      </div>
    </div>
  );
}
