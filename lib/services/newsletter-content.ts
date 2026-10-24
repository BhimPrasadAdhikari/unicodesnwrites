import mongoose from 'mongoose';

import Newsletter from '@/lib/models/Newsletter';
import { Post } from '@/lib/models/Post';
import { livePostFilter } from '@/lib/utils/post-visibility';

/** Campaign states in which a featured article counts as already emailed (or about to be). */
export const COMMITTED_CAMPAIGN_STATUSES = ['scheduled', 'sending', 'paused', 'sent'] as const;

const DEFAULT_DIGEST_LOOKBACK_DAYS = 7;
const MAX_DIGEST_POSTS = 10;

export interface NewsletterPostSummary {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  excerpt: string;
  coverImage?: string;
  category?: string;
  readingTime?: number;
  publishedAt?: Date;
}

const POST_SUMMARY_FIELDS = 'title slug excerpt coverImage category readingTime publishedAt published';

export const getAppUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '');

const escapeHtml = (value: string) =>
  value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character] || character));

const absoluteUrl = (value: string) => (value.startsWith('/') ? `${getAppUrl()}${value}` : value);

export const postUrl = (slug: string) => `${getAppUrl()}/blog/${encodeURIComponent(slug)}`;

const renderPostBlock = (post: NewsletterPostSummary, options: { headingTag: 'h1' | 'h2'; showImage: boolean }) => {
  const url = postUrl(post.slug); // slug is URL-encoded, so it is attribute-safe as-is
  const meta = [post.category, post.readingTime ? `${post.readingTime} min read` : '']
    .filter(Boolean)
    .map((part) => escapeHtml(String(part)))
    .join(' · ');
  const image = options.showImage && post.coverImage && /^(https?:|\/)/i.test(post.coverImage)
    // The newsletter sanitizer escapes attribute values itself, so these are
    // only stripped of characters that could break out of the quoted attribute.
    ? `<p><a href="${url}"><img src="${absoluteUrl(post.coverImage).replace(/["<>\s]/g, encodeURIComponent)}" alt="${post.title.replace(/["<>&]/g, '')}" /></a></p>`
    : '';

  return [
    image,
    meta ? `<p><em>${meta}</em></p>` : '',
    `<${options.headingTag}><a href="${url}">${escapeHtml(post.title)}</a></${options.headingTag}>`,
    `<p>${escapeHtml(post.excerpt)}</p>`,
    `<p><a href="${url}"><strong>Read the full article →</strong></a></p>`,
  ].filter(Boolean).join('\n');
};

export function buildArticleNewsletter(post: NewsletterPostSummary) {
  return {
    subject: post.title.slice(0, 150),
    previewText: post.excerpt.slice(0, 200),
    content: renderPostBlock(post, { headingTag: 'h1', showImage: true }),
  };
}

export function buildDigestNewsletter(posts: NewsletterPostSummary[], now: Date = new Date()) {
  const dateLabel = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const intro = posts.length === 1
    ? '<p>Here is what I published this week.</p>'
    : `<p>Here are the ${posts.length} articles I published this week.</p>`;
  const blocks = posts.map((post) => renderPostBlock(post, { headingTag: 'h2', showImage: false }));

  return {
    subject: `Weekly digest: ${posts[0]?.title ?? 'new articles'}${posts.length > 1 ? ` + ${posts.length - 1} more` : ''}`.slice(0, 150),
    previewText: `${dateLabel} · ${posts.map((post) => post.title).join(' · ')}`.slice(0, 200),
    content: [intro, ...blocks].join('\n<hr />\n'),
  };
}

/** Converts campaign HTML into a readable plain-text alternative part. */
export function htmlToPlainText(html: string) {
  return html
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, text: string) => {
      const label = text.replace(/<[^>]+>/g, '').trim();
      return label && label !== href ? `${label} (${href})` : href;
    })
    .replace(/<(br|hr)\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote|pre)>/gi, '\n\n')
    .replace(/<li\b[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 100_000);
}

/**
 * Returns, for each given post, the campaign that already emailed it (or is
 * scheduled / sending it). Posts without such a campaign are absent from the map.
 */
export async function findCommittedCampaignsForPosts(
  postIds: mongoose.Types.ObjectId[],
  options?: { excludeNewsletterId?: mongoose.Types.ObjectId },
) {
  const map = new Map<string, { newsletterId: string; subject: string; status: string }>();
  if (!postIds.length) return map;

  const campaigns = await Newsletter.find({
    posts: { $in: postIds },
    status: { $in: COMMITTED_CAMPAIGN_STATUSES },
    ...(options?.excludeNewsletterId ? { _id: { $ne: options.excludeNewsletterId } } : {}),
  })
    .select('posts subject status')
    .lean();

  const wanted = new Set(postIds.map((id) => id.toString()));
  for (const campaign of campaigns) {
    for (const postId of campaign.posts || []) {
      const key = postId.toString();
      if (wanted.has(key) && !map.has(key)) {
        map.set(key, { newsletterId: campaign._id.toString(), subject: campaign.subject, status: campaign.status });
      }
    }
  }
  return map;
}

/**
 * Live posts that have not been emailed yet, published since the last digest
 * went out (or within the lookback window when there is no previous digest).
 */
export async function findDigestCandidates(now: Date = new Date()) {
  const lastDigest = await Newsletter.findOne({ kind: 'digest', status: { $in: ['sending', 'paused', 'sent'] } })
    .sort({ sentAt: -1 })
    .select('sentAt')
    .lean();
  const lookbackStart = new Date(now.getTime() - DEFAULT_DIGEST_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const since = lastDigest?.sentAt && lastDigest.sentAt > lookbackStart ? lastDigest.sentAt : lookbackStart;

  const posts = await Post.find({
    ...livePostFilter(now),
    publishedAt: { $gte: since, $lte: now },
  })
    .sort({ publishedAt: -1 })
    .limit(MAX_DIGEST_POSTS * 3)
    .select(POST_SUMMARY_FIELDS)
    .lean<NewsletterPostSummary[]>();

  const committed = await findCommittedCampaignsForPosts(posts.map((post) => post._id));
  return {
    since,
    posts: posts.filter((post) => !committed.has(post._id.toString())).slice(0, MAX_DIGEST_POSTS),
  };
}

export async function loadPostsForNewsletter(postIds: mongoose.Types.ObjectId[]) {
  const posts = await Post.find({ _id: { $in: postIds } })
    .select(POST_SUMMARY_FIELDS)
    .lean<Array<NewsletterPostSummary & { published: boolean }>>();
  const order = new Map(postIds.map((id, index) => [id.toString(), index]));
  return posts.sort((a, b) => (order.get(a._id.toString()) ?? 0) - (order.get(b._id.toString()) ?? 0));
}
