import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';

import { AdminRowActions } from '@/components/cms/AdminRowActions';
import { FilterTabs, Pager, parsePage, redirectPastLastPage } from '@/components/cms/AdminListControls';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import { Badge } from '@/components/ui/Badge';
import { connectDB } from '@/lib/db/connection';
import Comment from '@/lib/models/Comment';
import { Post } from '@/lib/models/Post';
import { User } from '@/lib/models/User';

export const metadata: Metadata = { title: 'Comments | CMS' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

type CommentRow = {
  _id: { toString(): string };
  authorName: string;
  body: string;
  approved: boolean;
  createdAt: Date;
  post: { title?: string; slug?: string } | null;
  user: { email?: string } | null;
};

export default async function CommentsPage(props: { searchParams: Promise<{ state?: string; page?: string }> }) {
  const params = await props.searchParams;
  const page = parsePage(params.page);
  const state = params.state === 'approved' ? 'approved' : params.state === 'all' ? 'all' : 'pending';
  const query = state === 'all' ? {} : { approved: state === 'approved' };

  await connectDB();
  const [comments, total, pending, approved] = await Promise.all([
    Comment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate({ path: 'post', model: Post, select: 'title slug' })
      .populate({ path: 'user', model: User, select: 'email' })
      .lean<CommentRow[]>(),
    Comment.countDocuments(query),
    Comment.countDocuments({ approved: false }),
    Comment.countDocuments({ approved: true }),
  ]);
  const linkParams = { state: params.state };
  redirectPastLastPage('/dashboard/comments', linkParams, page, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <DashboardPageHeader
        eyebrow="Readers"
        title="Comments"
        description="Reader comments on posts. They appear under the post once you approve them; your own comments go live at once."
      />

      <div className="mb-5">
        <FilterTabs
          base="/dashboard/comments"
          params={linkParams}
          name="state"
          options={[
            { value: '', label: 'Waiting', count: pending },
            { value: 'approved', label: 'Live', count: approved },
            { value: 'all', label: 'All', count: pending + approved },
          ]}
        />
      </div>

      {comments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <MessageSquare className="mx-auto h-7 w-7 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">{state === 'pending' ? 'Nothing waiting for approval.' : 'No comments here yet.'}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => {
            const id = comment._id.toString();
            return (
              <li key={id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold">{comment.authorName}</span>
                  <span className="text-xs text-muted-foreground">{comment.user?.email || 'deleted account'}</span>
                  {comment.approved ? <Badge variant="info">Live</Badge> : <Badge variant="warning">Waiting</Badge>}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{comment.body}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {new Date(comment.createdAt).toLocaleString()} · on{' '}
                  {comment.post?.slug ? (
                    <Link href={`/blog/${comment.post.slug}#comments`} className="underline underline-offset-2">{comment.post.title}</Link>
                  ) : (
                    'a deleted post'
                  )}
                </p>
                <AdminRowActions
                  className="mt-4"
                  actions={[
                    comment.approved
                      ? { label: 'Hide', url: `/api/admin/comments/${id}`, method: 'PATCH', body: { approved: false } }
                      : { label: 'Approve', url: `/api/admin/comments/${id}`, method: 'PATCH', body: { approved: true }, tone: 'primary' },
                    { label: 'Delete', url: `/api/admin/comments/${id}`, method: 'DELETE', confirm: 'Confirm delete', tone: 'danger' },
                  ]}
                />
              </li>
            );
          })}
        </ul>
      )}

      <Pager base="/dashboard/comments" params={linkParams} page={page} totalPages={Math.ceil(total / PAGE_SIZE)} />
    </div>
  );
}
