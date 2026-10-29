import Link from 'next/link';
import { connectDB } from '@/lib/db/connection';
import { Post } from '@/lib/models/Post';
import { Series } from '@/lib/models/Series';
import BlogPostList from '@/components/cms/BlogPostList';
import { TrashedPostList, type TrashedPost } from '@/components/cms/TrashedPostList';
import { Comment } from '@/lib/models/Comment';
import { escapeRegex, FilterTabs, Pager, parsePage, redirectPastLastPage, SearchBox } from '@/components/cms/AdminListControls';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import { Plus } from 'lucide-react';
import { findCommittedCampaignsForPosts } from '@/lib/services/newsletter-content';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;
const BASE = '/dashboard/posts';
const TRASH_RETENTION_DAYS = 30;

type Status = 'published' | 'scheduled' | 'draft';
const STATUSES: Status[] = ['published', 'scheduled', 'draft'];

export default async function BlogPostsPage(props: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const params = await props.searchParams;
  const page = parsePage(params.page);
  const search = (params.q || '').trim().slice(0, 120);
  const status = STATUSES.find((value) => value === params.status);
  const inTrash = params.status === 'trash';
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
  // Trashed posts only ever appear on the Trash tab.
  const liveQuery = { ...searchQuery, trashedAt: null };
  const trashQuery = { ...searchQuery, trashedAt: { $ne: null } };
  const query = inTrash ? trashQuery : status ? { $and: [liveQuery, statusQuery[status]] } : liveQuery;

  await connectDB();
  if (inTrash) {
    // Past the retention window a trashed post goes for good, with its comments.
    const cutoff = new Date(now.getTime() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const expired = await Post.find({ trashedAt: { $lt: cutoff } }).select('_id').lean();
    if (expired.length) {
      const ids = expired.map((post) => post._id);
      // Re-check the cutoff on delete: a post restored meanwhile must survive, with its comments.
      await Post.deleteMany({ _id: { $in: ids }, trashedAt: { $lt: cutoff } });
      const kept = new Set((await Post.find({ _id: { $in: ids } }).select('_id').lean()).map((post) => String(post._id)));
      const removed = ids.filter((id) => !kept.has(String(id)));
      if (removed.length) await Comment.deleteMany({ post: { $in: removed } });
    }
  }
  const [posts, grouped, trashCount] = await Promise.all([
    Post.find(query)
      .sort({ createdAt: -1, _id: -1 }) // _id breaks ties so pages never repeat a post
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      // Only what the table shows; bodies made this page slow as posts grew.
      .select('title slug excerpt category published publishedAt views createdAt author seriesId seriesPart trashedAt')
      .populate('author', 'name')
      .lean(),
    // Tab counts for the current search, in one pass.
    Post.aggregate<{ _id: Status; count: number }>([
      { $match: liveQuery },
      {
        $group: {
          _id: { $cond: [{ $ne: ['$published', true] }, 'draft', { $cond: [{ $gt: ['$publishedAt', now] }, 'scheduled', 'published'] }] },
          count: { $sum: 1 },
        },
      },
    ]),
    Post.countDocuments(trashQuery),
  ]);
  const counts: Record<Status, number> = { published: 0, scheduled: 0, draft: 0 };
  for (const row of grouped) counts[row._id] = row.count;
  const all = counts.published + counts.scheduled + counts.draft;
  const total = inTrash ? trashCount : status ? counts[status] : all;
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
            { value: 'trash', label: 'Trash', count: trashCount },
          ]}
        />
        <SearchBox base={BASE} params={linkParams} placeholder="Search title, slug or excerpt" />
      </div>

      {inTrash ? (
        <TrashedPostList posts={JSON.parse(JSON.stringify(posts)) as TrashedPost[]} retentionDays={TRASH_RETENTION_DAYS} />
      ) : (
        <BlogPostList
          posts={JSON.parse(JSON.stringify(posts))}
          seriesList={JSON.parse(JSON.stringify(series))}
          emailedCampaigns={emailedCampaigns}
          emptyMessage={search || status ? 'No posts match these filters.' : undefined}
        />
      )}

      <Pager base={BASE} params={linkParams} page={page} totalPages={Math.ceil(total / PAGE_SIZE)} />
    </div>
  );
}
