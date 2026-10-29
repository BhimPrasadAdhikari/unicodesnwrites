/**
 * Query filter for posts that readers may see right now.
 *
 * A post is live when it is marked published and its publish date is not in
 * the future (posts without a publishedAt predate scheduling and stay live).
 */
export function livePostFilter(now: Date = new Date()) {
  return {
    published: true,
    publishedAt: { $not: { $gt: now } },
    // Trashing unpublishes too; this keeps a trashed post hidden even if a racing save republished it.
    trashedAt: null,
  };
}

export function isPostLive(post: { published?: boolean; publishedAt?: Date | string | null; trashedAt?: Date | string | null }, now: Date = new Date()) {
  if (!post.published || post.trashedAt) return false;
  if (!post.publishedAt) return true;
  return new Date(post.publishedAt).getTime() <= now.getTime();
}

/** Why a slug can't be used: trashed posts keep theirs until restored or deleted for good. */
export function slugTakenMessage(existing: { trashedAt?: Date | string | null }) {
  return existing.trashedAt
    ? 'A post in the trash uses this slug. Restore it or delete it forever first.'
    : 'Slug already exists';
}
