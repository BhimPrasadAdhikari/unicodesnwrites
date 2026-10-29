'use client';

import { useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Eye, Edit, ExternalLink, FileText, BarChart3 } from 'lucide-react';
import { ConfirmDeleteButton } from '@/components/cms/ConfirmDeleteButton';
import { CreateCampaignFromPostsButton } from '@/components/cms/CreateCampaignFromPostsButton';
import { Alert } from '@/components/ui/Alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

interface Post {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  published: boolean;
  publishedAt?: string;
  views: number;
  createdAt: string;
  author: {
    name: string;
  };
  seriesId?: string;
  seriesPart?: number;
}

interface Series {
  _id: string;
  title: string;
  slug: string;
}

interface EmailedCampaign {
  newsletterId: string;
  subject: string;
  status: string;
}

export default function BlogPostList({
  posts,
  seriesList = [],
  emailedCampaigns = {},
  emptyMessage = 'No blog posts yet. Create your first post!',
}: {
  posts: Post[];
  seriesList?: Series[];
  emailedCampaigns?: Record<string, EmailedCampaign>;
  /** Shown when the list is empty, e.g. after a search finds nothing */
  emptyMessage?: string;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState('');

  const handleDelete = async (postId: string) => {
    const response = await fetch(`/api/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'Post could not be deleted.');
    router.refresh();
  };

  const standalonePosts = posts.filter(p => !p.seriesId);
  const seriesGroups = posts.filter(p => p.seriesId).reduce((groups, post) => {
    const key = post.seriesId!;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(post);
    return groups;
  }, {} as Record<string, Post[]>);

  const PostRow = ({ post, isSeriesPart = false }: { post: Post, isSeriesPart?: boolean }) => {
    const isScheduled = post.published && Boolean(post.publishedAt) && new Date(post.publishedAt!).getTime() > Date.now();
    const emailed = emailedCampaigns[post._id];
    return (
    <TableRow key={post._id} className={isSeriesPart ? 'bg-secondary/40' : undefined}>
      <TableCell className={isSeriesPart ? 'pl-10' : undefined}>
        <div>
          <div className="font-medium text-foreground flex items-center gap-2">
            {isSeriesPart && <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-semibold text-foreground">Part {post.seriesPart}</span>}
            {post.title}
          </div>
          <div className="text-sm text-muted-foreground truncate max-w-md">
            {post.excerpt}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className="rounded-lg border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
          {post.category}
        </span>
      </TableCell>
      <TableCell>
        <span
          className={`px-2.5 py-1 text-xs font-medium rounded-lg ${
            post.published
              ? 'bg-success/10 text-success border border-success/20'
              : 'bg-warning/10 text-warning border border-warning/20'
          }`}
        >
          {isScheduled ? 'Scheduled' : post.published ? 'Published' : 'Draft'}
        </span>
        {isScheduled && (
          <div className="mt-1 text-xs text-muted-foreground">{new Date(post.publishedAt!).toLocaleString()}</div>
        )}
        {emailed && (
          <Link href={`/dashboard/newsletters/${emailed.newsletterId}/report`} className="mt-1 block text-xs text-foreground underline decoration-primary underline-offset-2 hover:text-primary" title={emailed.subject}>
            {emailed.status === 'sent' ? 'Emailed' : emailed.status === 'scheduled' ? 'Email scheduled' : 'Emailing…'}
          </Link>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Eye className="h-3.5 w-3.5" />
          {post.views}
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
      </TableCell>
      <TableCell className="text-right text-sm space-x-1">
        <Link
          href={`/blog/${post.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-foreground transition-colors hover:bg-secondary"
          title="View Live"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View
        </Link>
        <Link
          href={`/dashboard/posts/${post._id}/analytics`}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="View Analytics"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Stats
        </Link>
        <Link
          href={`/dashboard/posts/${post._id}/edit`}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-success hover:bg-success/10 transition-colors"
          title="Edit Post"
        >
          <Edit className="h-3.5 w-3.5" />
          Edit
        </Link>
        {post.published && !emailed && <CreateCampaignFromPostsButton mode="article" postId={post._id} compact />}
        <ConfirmDeleteButton label={post.title} onConfirm={() => handleDelete(post._id)} onError={setFeedback} />
      </TableCell>
    </TableRow>
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {feedback && <Alert variant="destructive" className="m-4">{feedback}</Alert>}
      <div className="overflow-x-auto">
      <Table className="min-w-[900px]">
        <TableHeader>
          <tr>
            <TableHead>
              Title
            </TableHead>
            <TableHead>
              Category
            </TableHead>
            <TableHead>
              Status
            </TableHead>
            <TableHead>
              Views
            </TableHead>
            <TableHead>
              Created
            </TableHead>
            <TableHead className="text-right">
              Actions
            </TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {/* Render Standalone Posts First */}
          {standalonePosts.map((post) => (
            <PostRow key={post._id} post={post} />
          ))}

          {/* Render Series Groups */}
          {Object.entries(seriesGroups).map(([seriesId, seriesPosts]) => {
            const seriesData = seriesList.find((s) => s._id.toString() === seriesId);
            const seriesTitle = seriesData?.title || 'Unknown Series';
            
            return (
              <Fragment key={seriesId}>
                {/* Series Header Row */}
                <TableRow className="bg-secondary">
                  <TableCell colSpan={6} className="border-b border-border py-3 font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">
                    Series: {seriesTitle} ({seriesPosts.length} parts)
                  </TableCell>
                </TableRow>
                {/* Series Posts */}
                {seriesPosts
                  .sort((a, b) => (a.seriesPart || 0) - (b.seriesPart || 0))
                  .map((post) => (
                    <PostRow key={post._id} post={post} isSeriesPart />
                  ))}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
      </div>

      {posts.length === 0 && (
        <div className="text-center py-16">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-secondary">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}
