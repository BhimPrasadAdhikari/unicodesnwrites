import Link from 'next/link';
import { connectDB } from '@/lib/db/connection';
import { Post } from '@/lib/models/Post';
import { Series } from '@/lib/models/Series';
import BlogPostList from '@/components/cms/BlogPostList';
import { escapeRegex, FilterTabs, Pager, parsePage, redirectPastLastPage, SearchBox } from '@/components/cms/AdminListControls';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import { Plus } from 'lucide-react';
import { findCommittedCampaignsForPosts } from '@/lib/services/newsletter-content';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;
const BASE = '/dashboard/posts';

type Status = 'published' | 'scheduled' | 'draft';
const STATUSES: Status[] = ['published', 'scheduled', 'draft'];

export default async function BlogPostsPage(props: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const params = await props.searchParams;
  const page = parsePage(params.page);
  const search = (params.q || '').trim().slice(0, 120);
  const status = STATUSES.find((value) => value === params.status);
  const now = new Date();

  const searchQuery: Record<string, unknown> = {};
  if (search) {
    const pattern = { $regex: escapeRegex(search), $options: 'i' };
    searchQuery.$or = [{ title: pattern }, { slug: pattern }, { excerpt: pattern }];
  }
  // Same split as the list's badge: published with a future date is "Scheduled".
  const statusQuery: Record<Status, Record<string, unknown>> = {
    published: { published: true, $or: [{ publishedAt: null }, { publishedAt: { $lte: now } }] },
    scheduled: { published: true, publishedAt: { $gt: now } },
    draft: { published: { $ne: true } },
  };
  const query = status ? { $and: [searchQuery, statusQuery[status]] } : searchQuery;

  await connectDB();
  const [posts, grouped] = await Promise.all([
    Post.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      // Only what the table shows; bodies made this page slow as posts grew.
      .select('title slug excerpt category published publishedAt views createdAt author seriesId seriesPart')
      .populate('author', 'name')
      .lean(),
    // Tab counts for the current search, in one pass.
    Post.aggregate<{ _id: Status; count: number }>([
      { $match: searchQuery },
      {
        $group: {
          _id: { $cond: [{ $ne: ['$published', true] }, 'draft', { $cond: [{ $gt: ['$publishedAt', now] }, 'scheduled', 'published'] }] },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);
  const counts: Record<Status, number> = { published: 0, scheduled: 0, draft: 0 };
  for (const row of grouped) counts[row._id] = row.count;
  const all = counts.published + counts.scheduled + counts.draft;
  const total = status ? counts[status] : all;
  const linkParams = { q: params.q, status: params.status };
  redirectPastLastPage(BASE, linkParams, page, Math.ceil(total / PAGE_SIZE));

  const seriesIds = [...new Set(posts.flatMap((post) => (post.seriesId ? [post.seriesId.toString()] : [])))];
  const [series, emailed] = await Promise.all([
    seriesIds.length ? Series.find({ _id: { $in: seriesIds } }).select('title slug').lean() : [],
    findCommittedCampaignsForPosts(posts.map((post) => post._id)),
  ]);
  const emailedCampaigns = Object.fromEntries(emailed);

  return (
    <div>
      <DashboardPageHeader
        eyebrow="Content Publishing"
        title="Blog Posts"
        description="Draft, publish, organize, and manage technical blog posts, deep dives, and articles."
        action={
          <Link href="/dashboard/posts/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors">
            <Plus className="h-4 w-4" /> New post
          </Link>
        }
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs
          base={BASE}
          params={linkParams}
          name="status"
          options={[
            { value: '', label: 'All', count: all },
            { value: 'published', label: 'Published', count: counts.published },
            { value: 'scheduled', label: 'Scheduled', count: counts.scheduled },
            { value: 'draft', label: 'Drafts', count: counts.draft },
          ]}
        />
        <SearchBox base={BASE} params={linkParams} placeholder="Search title, slug or excerpt" />
      </div>

      <BlogPostList
        posts={JSON.parse(JSON.stringify(posts))}
        seriesList={JSON.parse(JSON.stringify(series))}
        emailedCampaigns={emailedCampaigns}
        emptyMessage={search || status ? 'No posts match these filters.' : undefined}
      />

      <Pager base={BASE} params={linkParams} page={page} totalPages={Math.ceil(total / PAGE_SIZE)} />
    </div>
  );
}
