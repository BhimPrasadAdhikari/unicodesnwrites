import { Trash2 } from 'lucide-react';

import { AdminRowActions } from '@/components/cms/AdminRowActions';

export interface TrashedPost {
  _id: string;
  title: string;
  slug: string;
  trashedAt: string;
}

/** The Trash tab: restore a post as a draft, or delete it for good. */
export function TrashedPostList({ posts, retentionDays }: { posts: TrashedPost[]; retentionDays: number }) {
  if (!posts.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center">
        <Trash2 className="mx-auto h-7 w-7 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">The trash is empty.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {posts.map((post) => {
        const trashedAt = new Date(post.trashedAt);
        const purgeAt = new Date(trashedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000);
        return (
          <li key={post._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-semibold">{post.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-mono">/{post.slug}</span> · trashed {trashedAt.toLocaleDateString()} · deleted for good after {purgeAt.toLocaleDateString()}
              </p>
            </div>
            <AdminRowActions
              actions={[
                { label: 'Restore as draft', url: `/api/posts/${post._id}/restore`, method: 'POST', tone: 'primary' },
                { label: 'Delete forever', url: `/api/posts/${post._id}?permanent=1`, method: 'DELETE', confirm: 'Confirm delete forever', tone: 'danger' },
              ]}
            />
          </li>
        );
      })}
    </ul>
  );
}
