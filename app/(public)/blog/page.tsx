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
  title: 'Blog & Breakdowns | unicodesnwrites',
  description: 'In-depth write-ups on machine learning systems, research paper math derived from scratch, and practical guides on autonomous agents.',
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
            <p className="text-eyebrow text-primary">§ Writing</p>
            <h1 className="mt-3 text-title">
              Papers taken apart, agents built, projects shipped.
            </h1>
            <div className="mt-12 rounded-3xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
              <BookOpen className="mx-auto h-7 w-7 text-primary" />
              <h2 className="mt-4 text-xl font-medium">The archive is temporarily offline</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                The reading experience is ready, but the sandbox content service is unavailable. Published notes will reappear automatically when it reconnects.
              </p>
            </div>
          </div>
        </Container>
      </Section>
    );
  }
  const resolvedSearchParams = await searchParams;

  const page = parseInt(resolvedSearchParams.page || '1');
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

  const [allPosts, seriesList, categories] = await Promise.all([
    Post.find(query)
      .sort({ publishedAt: -1 })
      .populate({ path: 'author', model: User, select: 'name' })
      .lean() as unknown as IPost[],
    showSeries
      ? Series.find({ published: true }).sort({ createdAt: -1 }).lean()
      : Promise.resolve([] as ISeries[]),
    Post.distinct('category', livePostFilter()),
  ]);

  // Build a Set of ALL series IDs (as strings) for reliable comparison
  // regardless of whether posts store seriesId as string or ObjectId
  const allSeriesIdStrings = new Set(
    (await Series.find().select('_id').lean()).map((s) => s._id.toString())
  );

  // ── Partition posts: standalone vs series parts ────────────────────────────
  const standalonePosts = allPosts.filter(
    (p) => !p.seriesId || !allSeriesIdStrings.has(p.seriesId.toString())
  );
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

  // Count for header stat (series + standalone posts)
  const totalArticles = standaloneTotal + (showSeries ? augmentedSeries.reduce((acc, s) => acc + s.partCount, 0) : 0);
  const normalizedCategories = categories.filter(Boolean) as string[];

  return (
    <div className="min-h-screen">
      <Section className="pb-12 pt-12 md:pb-16 md:pt-16">
        <Container>
          <div className="mb-10 max-w-3xl">
            <p className="text-eyebrow text-primary">§ Writing</p>
            <h1 className="mt-3 text-title text-foreground">
              Papers taken apart, agents built, projects shipped.
            </h1>
            <p className="mt-4 text-[17px] leading-[1.6] text-muted-foreground">
              In-depth write-ups on the machine learning systems I build, paper math derived from scratch, and guides on autonomous agents.
            </p>
            <p className="mt-5 font-mono text-[12px] tracking-[0.06em] text-muted-foreground">
              <AnimatedCounter value={totalArticles} /> ARTICLES · <AnimatedCounter value={augmentedSeries.length} /> SERIES · <AnimatedCounter value={normalizedCategories.length} /> CATEGORIES
            </p>
          </div>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              {/* Posts & Series Uncrowded Feed */}
              {pagedItems.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  No articles matched your filters. Try a broader keyword or another category.
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
                <div className="flex justify-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Link
                      key={p}
                      href={`/blog?page=${p}${resolvedSearchParams.category ? `&category=${encodeURIComponent(resolvedSearchParams.category)}` : ''}${resolvedSearch ? `&q=${encodeURIComponent(resolvedSearch)}` : ''}`}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        p === page
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {p}
                    </Link>
                  ))}
                </div>
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
