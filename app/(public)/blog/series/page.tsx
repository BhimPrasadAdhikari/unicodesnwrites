import type { Metadata } from 'next';
import Link from 'next/link';

import SeriesCard from '@/components/public/SeriesCard';
import { Container } from '@/components/ui/Section';
import { connectDB } from '@/lib/db/connection';
import { Post } from '@/lib/models/Post';
import { Series } from '@/lib/models/Series';
import { livePostFilter } from '@/lib/utils/post-visibility';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Article series',
  description: 'Article series that explain one AI topic in a few short parts. Read them in order, one step at a time.',
  alternates: { canonical: '/blog/series' },
};

type SeriesRow = { _id: { toString(): string }; title: string; slug: string; description?: string; coverImage?: string; createdAt: Date };

export default async function SeriesIndexPage() {
  let rows: Array<SeriesRow & { partCount: number; latestPublishedAt: Date }> = [];
  try {
    await connectDB();
    const series = await Series.find({ published: true }).select('title slug description coverImage createdAt').lean<SeriesRow[]>();
    const stats = await Post.aggregate<{ _id: unknown; parts: number; latest: Date }>([
      { $match: { ...livePostFilter(), seriesId: { $in: series.map((s) => s._id) } } },
      { $group: { _id: '$seriesId', parts: { $sum: 1 }, latest: { $max: '$publishedAt' } } },
    ]);
    const byId = new Map(stats.map((row) => [String(row._id), row]));
    rows = series
      .map((s) => ({ ...s, partCount: byId.get(s._id.toString())?.parts ?? 0, latestPublishedAt: byId.get(s._id.toString())?.latest ?? s.createdAt }))
      .filter((s) => s.partCount > 0)
      .sort((a, b) => new Date(b.latestPublishedAt).getTime() - new Date(a.latestPublishedAt).getTime());
  } catch (error) {
    console.error('Failed to load series index', error);
  }

  return (
    <Container className="py-12 sm:py-16">
      <div className="mb-10 max-w-3xl">
        <p className="text-eyebrow text-primary">Article series</p>
        <h1 className="mt-3 text-title">Read these in order.</h1>
        <p className="mt-4 text-[17px] leading-[1.6] text-muted-foreground">
          Each series explains one topic in a few short parts. Start at part one and go step by step.
        </p>
      </div>
      {rows.length ? (
        <div className="flex flex-col">
          {rows.map((series) => (
            <div key={series._id.toString()} className="py-5 first:pt-0">
              <SeriesCard series={{ ...series, _id: series._id.toString() }} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">
          No series yet. See <Link href="/blog" className="underline decoration-primary decoration-2 underline-offset-4">all articles</Link>.
        </p>
      )}
    </Container>
  );
}
