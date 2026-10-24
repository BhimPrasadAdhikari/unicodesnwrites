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
  };
}

export function isPostLive(post: { published?: boolean; publishedAt?: Date | string | null }, now: Date = new Date()) {
  if (!post.published) return false;
  if (!post.publishedAt) return true;
  return new Date(post.publishedAt).getTime() <= now.getTime();
}
