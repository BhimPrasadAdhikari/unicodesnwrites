import { connectDB } from '@/lib/db/connection';
import { Post, IPost } from '@/lib/models/Post';
import { ISeries, Series } from '@/lib/models/Series';
import BlogCard from '@/components/public/BlogCard';
import SeriesCard from '@/components/public/SeriesCard';
import { User } from '@/lib/models/User';
import Link from 'next/link';
import BlogSidebar from '@/components/public/BlogSidebar';
import { Section, Container } from '@/components/ui/Section';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { BookOpen } from 'lucide-react';
import { livePostFilter } from '@/lib/utils/post-visibility';

export const metadata = {
  title: 'Articles',
  alternates: { canonical: '/blog' },
  description: 'Easy-to-follow articles that explain how AI works: machine learning, large language models (LLMs), AI agents and research papers, broken into simple steps.',
};

// ─── Types ──────────────────────────────────────────────────────────────────

type AugmentedSeries = Omit<ISeries, '_id'> & {
  _id: string;
  partCount: number;
  latestPublishedAt: Date;
};

type ListItem =
  | { type: 'post'; sortDate: Date; data: IPost }
  | { type: 'series'; sortDate: Date; data: AugmentedSeries };

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; q?: string; search?: string }>;
}) {
  try {
    await connectDB();
  } catch (error) {
    console.error('Failed to load the public field-note archive', error);
    return (
      <Section className="pt-16 md:pt-24">
        <Container>
          <div className="max-w-4xl">
            <p className="text-eyebrow text-primary">Articles</p>
            <h1 className="mt-3 text-title">
              Easy reads on how AI works.
            </h1>
            <div className="mt-12 rounded-3xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
              <BookOpen className="mx-auto h-7 w-7 text-primary" />
              <h2 className="mt-4 text-xl font-medium">Articles can&apos;t load right now</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                Something went wrong on our side. Please try again in a few minutes.
              </p>
            </div>
          </div>
        </Container>
      </Section>
    );
  }
  const resolvedSearchParams = await searchParams;

  const page = Math.max(1, Number.parseInt(resolvedSearchParams.page || '1', 10) || 1);
  const limit = 10;
  const skip = (page - 1) * limit;

  // ── Build base post query ──────────────────────────────────────────────────
  const query: Record<string, unknown> = { ...livePostFilter() };
  if (resolvedSearchParams.category) {
    query.category = resolvedSearchParams.category;
  }

  const resolvedSearch = resolvedSearchParams.q || resolvedSearchParams.search || '';
  const searchTerm = resolvedSearch.trim();
  if (searchTerm) {
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    query.$or = [{ title: regex }, { excerpt: regex }, { tags: regex }];
  }

  // ── Fetch all data ──────────────────────────────────────────────────────────
  const showSeries = !resolvedSearchParams.category && !searchTerm;

  // One round trip for everything: the database can be far from the server.
  const [allPosts, seriesList, categories, allSeriesIds] = await Promise.all([
    Post.find(query)
      .sort({ publishedAt: -1 })
      // The list never shows the body; leaving it out keeps this query small.
      .select('-content -aiSummary')
      .populate({ path: 'author', model: User, select: 'name' })
      .lean() as unknown as IPost[],
    showSeries
      ? Series.find({ published: true }).sort({ createdAt: -1 }).lean()
      : Promise.resolve([] as ISeries[]),
    Post.distinct('category', livePostFilter()),
    Series.find().select('_id').lean(),
  ]);

  // Build a Set of ALL series IDs (as strings) for reliable comparison
  // regardless of whether posts store seriesId as string or ObjectId
  const allSeriesIdStrings = new Set(allSeriesIds.map((s) => s._id.toString()));

  // ── Partition posts: standalone vs series parts ────────────────────────────
  // A search or category filter shows every matching post, series parts included;
  // the unfiltered feed folds series parts into their series card.
  const standalonePosts = showSeries
    ? allPosts.filter((p) => !p.seriesId || !allSeriesIdStrings.has(p.seriesId.toString()))
    : allPosts;
  const standaloneTotal = standalonePosts.length;

  // ── Augment series with partCount + latestPublishedAt ────────────────────
  const augmentedSeries: AugmentedSeries[] = seriesList.map((s) => {
    const seriesIdStr = s._id.toString();
    const seriesPosts = allPosts.filter(
      (p) => p.seriesId && p.seriesId.toString() === seriesIdStr
    );
    const latestPost = seriesPosts[0]; // already sorted by publishedAt desc
    return {
      ...s,
      _id: seriesIdStr,
      partCount: seriesPosts.length,
      latestPublishedAt: (latestPost?.publishedAt ?? s.createdAt) as Date,
    };
  });

  // ── Merge and sort by latest activity date ────────────────────────────────
  const items: ListItem[] = [
    ...standalonePosts.map((p) => ({
      type: 'post' as const,
      sortDate: p.publishedAt ? new Date(p.publishedAt) : new Date(p.createdAt),
      data: p,
    })),
    ...augmentedSeries.map((s) => ({
      type: 'series' as const,
      sortDate: new Date(s.latestPublishedAt),
      data: s,
    })),
  ].sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

  // ── Paginate the merged list ───────────────────────────────────────────────
  const pagedItems = items.slice(skip, skip + limit);
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const pageHref = (p: number) =>
    `/blog?page=${p}${resolvedSearchParams.category ? `&category=${encodeURIComponent(resolvedSearchParams.category)}` : ''}${resolvedSearch ? `&q=${encodeURIComponent(resolvedSearch)}` : ''}`;

  // Count for header stat (series + standalone posts)
  const totalArticles = standaloneTotal + (showSeries ? augmentedSeries.reduce((acc, s) => acc + s.partCount, 0) : 0);
  const normalizedCategories = categories.filter(Boolean) as string[];

  return (
    <div className="min-h-screen">
      <Section className="pb-12 pt-12 md:pb-16 md:pt-16">
        <Container>
          <div className="mb-10 max-w-3xl">
            <p className="text-eyebrow text-primary">Articles</p>
            <h1 className="mt-3 text-title text-foreground">
              Easy reads on how AI works.
            </h1>
            <p className="mt-4 text-[17px] leading-[1.6] text-muted-foreground">
              Short, clear articles that explain AI one step at a time. Start with any one that looks interesting, no background needed.
            </p>
            <p className="mt-5 font-mono text-[12px] tracking-[0.06em] text-muted-foreground">
              <AnimatedCounter value={totalArticles} /> ARTICLES · <AnimatedCounter value={augmentedSeries.length} /> SERIES · <AnimatedCounter value={normalizedCategories.length} /> TOPICS
            </p>
          </div>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              {/* Posts & Series Uncrowded Feed */}
              {pagedItems.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  No articles found. Try a different word or another topic.
                </div>
              ) : (
                <div className="mb-10 flex flex-col">
                  {pagedItems.map((item) =>
                    item.type === 'series' ? (
                      <div key={`series-${item.data._id}`} className="py-5 first:pt-0">
                        <SeriesCard series={item.data as AugmentedSeries} />
                      </div>
                    ) : (
                      <BlogCard key={item.data._id.toString()} post={item.data as IPost} />
                    )
                  )}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2">
                  {page > 1 ? (
                    <Link href={pageHref(page - 1)} rel="prev" className="min-h-10 rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground">← Newer</Link>
                  ) : null}
                  {pageNumbers(page, totalPages).map((p, index) =>
                    p === null ? (
                      <span key={`gap-${index}`} className="px-2 text-sm text-muted-foreground" aria-hidden="true">…</span>
                    ) : (
                      <Link
                        key={p}
                        href={pageHref(p)}
                        aria-current={p === page ? 'page' : undefined}
                        className={`min-h-10 rounded-lg px-4 py-2 text-sm transition-colors ${
                          p === page
                            ? 'bg-foreground text-background'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {p}
                      </Link>
                    )
                  )}
                  {page < totalPages ? (
                    <Link href={pageHref(page + 1)} rel="next" className="min-h-10 rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Older →</Link>
                  ) : null}
                </nav>
              )}
            </div>

            <div className="lg:sticky lg:top-24 self-start">
              <BlogSidebar categories={normalizedCategories} />
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}

/** Page numbers to show: first, last and two either side of the current page, with gaps as null. */
function pageNumbers(current: number, total: number): Array<number | null> {
  const wanted = new Set([1, total, current - 2, current - 1, current, current + 1, current + 2]);
  const pages = [...wanted].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: Array<number | null> = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) out.push(null);
    out.push(p);
  });
  return out;
}
