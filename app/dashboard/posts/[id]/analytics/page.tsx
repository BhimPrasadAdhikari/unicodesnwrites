'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Eye, Globe, Users } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import MetricCard from '@/components/cms/MetricCard';
import DateRangePicker from '@/components/cms/DateRangePicker';
import GenericPieChart from '@/components/cms/charts/GenericPieChart';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import { Alert } from '@/components/ui/Alert';

interface TimelinePoint { date: string; views: number; visitors: number }
interface BreakdownPoint { name: string; value: number }
interface PostAnalyticsData {
  post: { title: string; slug: string; category: string };
  summary: {
    views: { value: number; change: number };
    visitors: { value: number; change: number };
  };
  timeline: TimelinePoint[];
  referrers: BreakdownPoint[];
  devices: BreakdownPoint[];
  countries: BreakdownPoint[];
}

export default function PostAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<PostAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPostAnalytics = async () => {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/analytics/posts/${encodeURIComponent(id)}?${searchParams}`);
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Post analytics could not be loaded.');
        setData(payload);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Post analytics could not be loaded.');
      } finally {
        setLoading(false);
      }
    };
    fetchPostAnalytics();
  }, [id, searchParams]);

  if (loading && !data) return <div className="flex min-h-[420px] items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="Loading post analytics" /></div>;
  if (!data) return <Alert variant="destructive" className="p-6">{error || 'Post analytics are unavailable.'}</Alert>;

  return (
    <div className="space-y-7">
      <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to posts</button>
      <DashboardPageHeader
        eyebrow="Article Analytics"
        title={data.post.title}
        description="Traffic, visitors, and reader engagement metrics for this blog post."
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground">{data.post.category}</span>
            <Link href={`/blog/${data.post.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-3.5 text-sm font-semibold transition hover:bg-muted"><ExternalLink className="h-4 w-4" /> View post</Link>
            <DateRangePicker />
          </div>
        )}
      />

      {error && <Alert variant="warning">Showing the last available result. Refresh failed: {error}</Alert>}

      <section aria-label="Article summary" className="grid gap-4 sm:grid-cols-2">
        <MetricCard title="Total views" value={data.summary.views.value.toLocaleString()} change={data.summary.views.change} icon={<Eye className="h-5 w-5" />} variant="default" />
        <MetricCard title="Unique visitors" value={data.summary.visitors.value.toLocaleString()} change={data.summary.visitors.change} icon={<Users className="h-5 w-5" />} variant="default" />
      </section>

      <section className="rounded-xl border border-border bg-card/70 p-4 sm:p-6">
        <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-eyebrow text-primary">Reading traffic</p><h2 className="mt-2 text-lg font-semibold">Views and visitors</h2></div><p className="text-xs text-muted-foreground">Selected reporting period</p></div>
        <div className="h-[340px] w-full sm:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.timeline}>
              <defs>
                <linearGradient id="postViews" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7c3aed" stopOpacity={0.22}/><stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/></linearGradient>
                <linearGradient id="postVisitors" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.18}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="currentColor" className="text-border" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={11} stroke="currentColor" className="text-muted-foreground" />
              <YAxis axisLine={false} tickLine={false} fontSize={11} stroke="currentColor" className="text-muted-foreground" />
              <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }} />
              <Area type="monotone" dataKey="views" stroke="#7c3aed" strokeWidth={2.5} fill="url(#postViews)" />
              <Area type="monotone" dataKey="visitors" stroke="#10b981" strokeWidth={2.5} fill="url(#postVisitors)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2"><GenericPieChart title="Traffic sources" data={data.referrers} /><GenericPieChart title="Devices" data={data.devices} /></div>

      <section className="rounded-xl border border-border bg-card/70 p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" /><h2 className="font-semibold">Top countries</h2></div>
        {data.countries.length === 0 ? <p className="rounded-xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">No geographic data is available for this period.</p> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{data.countries.map((country) => <article key={country.name} className="rounded-xl border border-border bg-background/70 p-4"><p className="truncate text-sm font-semibold">{country.name}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{country.value.toLocaleString()}</p><p className="text-xs text-muted-foreground">views</p></article>)}</div>
        )}
      </section>
    </div>
  );
}
