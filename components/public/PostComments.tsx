import { format } from 'date-fns';

import CommentForm from '@/components/public/CommentForm';
import { connectDB } from '@/lib/db/connection';
import Comment from '@/lib/models/Comment';
import { User } from '@/lib/models/User';

type CommentRow = { _id: { toString(): string }; authorName: string; body: string; createdAt: Date; user: { role?: string } | null };

/** Approved comments under a post, oldest first, plus the form to add one. */
export default async function PostComments({ postId, postSlug }: { postId: string; postSlug: string }) {
  let comments: CommentRow[] = [];
  try {
    await connectDB();
    comments = await Comment.find({ post: postId, approved: true })
      .sort({ createdAt: 1 })
      .limit(200)
      .populate({ path: 'user', model: User, select: 'role' })
      .lean<CommentRow[]>();
  } catch (error) {
    console.error('Failed to load comments', error);
  }

  return (
    <section id="comments" aria-labelledby="comments-heading" className="mt-12 scroll-mt-24 border-t border-border pt-8">
      <h2 id="comments-heading" className="text-eyebrow text-muted-foreground">
        Discussion{comments.length ? ` · ${comments.length}` : ''}
      </h2>
      {comments.length ? (
        <ol className="mt-5 space-y-5">
          {comments.map((comment) => (
            <li key={comment._id.toString()} className="rounded-xl border border-border bg-card p-5">
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">{comment.authorName}</span>
                {comment.user?.role === 'admin' ? (
                  <span className="rounded-md border border-primary/30 px-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-primary">Author</span>
                ) : null}
                <time dateTime={new Date(comment.createdAt).toISOString()} className="text-xs text-muted-foreground">
                  {format(new Date(comment.createdAt), 'MMM d, yyyy')}
                </time>
              </p>
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">{comment.body}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No comments yet. Start the discussion.</p>
      )}
      <div className="mt-6">
        <CommentForm postSlug={postSlug} />
      </div>
    </section>
  );
}
