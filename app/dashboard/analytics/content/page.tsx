'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import DateRangePicker from '@/components/cms/DateRangePicker';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import { Alert } from '@/components/ui/Alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

type ContentType = 'blog' | 'projects' | 'products';
interface ContentMetric { title?: string; slug: string; views: number; visitors: number; clicks: number; ctr: number }

const routePrefixes: Record<ContentType, string> = { blog: '/blog', projects: '/projects', products: '/products' };

export default function ContentAnalyticsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<ContentType>('blog');
  const [data, setData] = useState<ContentMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const query = new URLSearchParams(searchParams);
        query.set('type', activeTab);
        const response = await fetch(`/api/analytics/content?${query}`);
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Content analytics could not be loaded.');
        setData(Array.isArray(payload?.content) ? payload.content : []);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Content analytics could not be loaded.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab, searchParams]);

  return (
    <div className="space-y-7">
      <DashboardPageHeader eyebrow="Content Analytics" title="Content Performance" description="Compare how blog posts, projects, and products attract visitors and generate engagement." action={<DateRangePicker />} />

      <div role="tablist" aria-label="Content type" className="flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-muted/35 p-1 sm:w-fit">
        {(['blog', 'projects', 'products'] as const).map((tab) => (
          <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`min-w-24 rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${activeTab === tab ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{tab === 'blog' ? 'Blog Posts' : tab}</button>
        ))}
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <section className="overflow-hidden rounded-xl border border-border bg-card/70">
        {loading ? <div className="p-12 text-center text-sm text-muted-foreground animate-pulse">Loading content signals…</div> : data.length === 0 ? <div className="p-12 text-center"><p className="font-semibold">No data for this period</p><p className="mt-2 text-sm text-muted-foreground">Try a wider date range or publish more {activeTab === 'blog' ? 'blog posts' : activeTab}.</p></div> : (
          <div className="overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader><tr><TableHead>Content</TableHead><TableHead className="text-right">Views</TableHead><TableHead className="text-right">Visitors</TableHead><TableHead className="text-right">Clicks</TableHead><TableHead className="text-right">CTR</TableHead></tr></TableHeader>
              <TableBody>
                {data.map((item) => {
                  const href = `${routePrefixes[activeTab]}/${encodeURIComponent(item.slug)}`;
                  return (
                    <TableRow key={item.slug}>
                      <TableCell><Link href={href} target="_blank" rel="noreferrer" className="group inline-flex max-w-md items-start gap-2"><span><span className="block truncate font-semibold group-hover:text-primary">{item.title || 'Untitled'}</span><span className="mt-1 block truncate text-xs font-normal text-muted-foreground">{href}</span></span><ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /></Link></TableCell>
                      <TableCell className="text-right font-medium">{item.views.toLocaleString()}</TableCell><TableCell className="text-right text-muted-foreground">{item.visitors.toLocaleString()}</TableCell><TableCell className="text-right text-muted-foreground">{item.clicks.toLocaleString()}</TableCell><TableCell className="text-right font-mono font-medium">{item.ctr.toFixed(1)}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
