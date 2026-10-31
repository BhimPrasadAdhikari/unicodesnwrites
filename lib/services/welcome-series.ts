import mongoose from 'mongoose';

import Course from '@/lib/models/Course';
import { Post } from '@/lib/models/Post';
import { Series } from '@/lib/models/Series';
import SiteSetting from '@/lib/models/SiteSetting';
import Subscriber, { type ISubscriber } from '@/lib/models/Subscriber';
import { EMAIL_SEND_RATE, sendWelcomeSeriesEmail, type WelcomeSeriesSection } from '@/lib/services/email';
import { MAILBOX_GONE_PATTERN, classifySendError, suppressBouncedSubscriber } from '@/lib/services/newsletter-delivery';
import { livePostFilter } from '@/lib/utils/post-visibility';
import { BOUNCED_TAG, MAX_SUBSCRIBER_TAGS } from '@/lib/utils/validations/subscriber';
import {
  DEFAULT_WELCOME_SERIES,
  welcomeSeriesSettingsSchema,
  type WelcomeSeriesSettings,
  type WelcomeSeriesUpdate,
} from '@/lib/utils/validations/welcome-series';

const SETTINGS_KEY = 'welcomeSeries';
const STATS_KEY_PREFIX = 'welcomeSeriesStats:';
const DAY_MS = 24 * 60 * 60 * 1000;
// A claimed subscriber is skipped by other runs for this long; a run that dies mid-send
// leaves them due again afterwards.
const CLAIM_LEASE_MS = 15 * 60 * 1000;
const TRANSIENT_RETRY_MS = 60 * 60 * 1000;
// A late step (the series was switched off for a while, or the provider was down) is
// still spaced at least this far from the one before it.
const MIN_STEP_GAP_MS = DAY_MS;
// "Your first week" mail makes no sense months later: past this, the series just ends.
const MAX_SERIES_AGE_MS = 30 * DAY_MS;
export const WELCOME_SENDS_PER_RUN = 100;

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

/**
 * Signup forms say where someone subscribed, not what they read, so only the blog
 * forms map to a tag: it lets a campaign target people who joined from an article.
 */
const SOURCE_TAGS: Partial<Record<ISubscriber['source'], string>> = {
  blog: 'blog-reader',
  'blog-sidebar': 'blog-reader',
  'blog-post-inline': 'blog-reader',
  'blog-post-end': 'blog-reader',
};

export function sourceTagsFor(source?: string | null): string[] {
  const tag = source ? SOURCE_TAGS[source as ISubscriber['source']] : undefined;
  return tag ? [tag] : [];
}

const SOURCE_TAG_SET = new Set(Object.values(SOURCE_TAGS));

/** The stored settings, or the (disabled) defaults when missing or malformed. */
export async function getWelcomeSeriesSettings(): Promise<WelcomeSeriesSettings> {
  const doc = await SiteSetting.findOne({ key: SETTINGS_KEY }).lean();
  const parsed = welcomeSeriesSettingsSchema.safeParse(doc?.value);
  return parsed.success ? parsed.data : DEFAULT_WELCOME_SERIES;
}

/** Applies an admin update. Delays stay as configured; only on/off and the copy change. */
export async function saveWelcomeSeriesSettings(update: WelcomeSeriesUpdate): Promise<WelcomeSeriesSettings> {
  const current = await getWelcomeSeriesSettings();
  const next = welcomeSeriesSettingsSchema.parse({
    enabled: update.enabled,
    steps: current.steps.map((step, index) => (index === 0 ? step : { ...step, ...update.steps[index - 1] })),
  });
  await SiteSetting.updateOne({ key: SETTINGS_KEY }, { $set: { value: next } }, { upsert: true });
  return next;
}

/**
 * Fields to $set when a subscriber confirms: schedules step 1 only while the series is
 * enabled, and never restarts a series they already started on an earlier confirmation.
 */
export function welcomeSeriesStartFields(
  settings: WelcomeSeriesSettings | null,
  subscriber: Pick<ISubscriber, 'welcomeStep' | 'welcomeNextAt'>,
  now: Date,
) {
  if (!settings?.enabled || settings.steps.length < 2) return {};
  if (subscriber.welcomeNextAt || (subscriber.welcomeStep ?? 0) > 0) return {};
  return { welcomeStep: 0, welcomeNextAt: new Date(now.getTime() + settings.steps[1].delayDays * DAY_MS) };
}

/** Adds the source-derived tag after confirmation, within the per-subscriber tag limit. */
export async function addSourceTags(subscriberId: mongoose.Types.ObjectId, source?: string | null) {
  const tags = sourceTagsFor(source);
  if (!tags.length) return;
  await Subscriber.updateOne(
    { _id: subscriberId, [`tags.${MAX_SUBSCRIBER_TAGS - 1}`]: { $exists: false } },
    { $addToSet: { tags: { $each: tags } } },
  );
}

// ---------------------------------------------------------------------------
// Content per step

type PostRow = { title: string; slug: string; excerpt?: string; views?: number };
type CourseRow = { title: string; slug: string; summary?: string };
type SeriesRow = { _id: mongoose.Types.ObjectId; title: string; slug: string; description?: string };

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The subscriber's topic tags (admin-set), as case-insensitive exact matchers. */
function topicMatchers(tags: readonly string[] | undefined) {
  return (tags || [])
    .filter((tag) => tag && tag !== BOUNCED_TAG && !SOURCE_TAG_SET.has(tag))
    .slice(0, MAX_SUBSCRIBER_TAGS)
    .map((tag) => new RegExp(`^${escapeRegex(tag)}$`, 'i'));
}

const postLink = (post: PostRow) => ({ title: post.title, url: `${APP_URL}/blog/${encodeURIComponent(post.slug)}`, description: post.excerpt || undefined });

async function newestSeries(postMatch: Record<string, unknown>): Promise<SeriesRow | null> {
  const recent = await Post.aggregate<{ _id: mongoose.Types.ObjectId }>([
    { $match: { ...livePostFilter(), seriesId: { $ne: null }, ...postMatch } },
    { $group: { _id: '$seriesId', latest: { $max: '$publishedAt' } } },
    { $sort: { latest: -1 } },
    { $limit: 10 },
  ]);
  if (!recent.length) return null;
  const published = await Series.find({ _id: { $in: recent.map((row) => row._id) }, published: true })
    .select('title slug description')
    .lean<SeriesRow[]>();
  const byId = new Map(published.map((series) => [String(series._id), series]));
  for (const row of recent) {
    const series = byId.get(String(row._id));
    if (series) return series;
  }
  return null;
}

const topPosts = (match: Record<string, unknown>, limit = 3) =>
  Post.find({ ...livePostFilter(), ...match })
    .select('title slug excerpt views')
    .sort({ views: -1, publishedAt: -1 })
    .limit(limit)
    .lean<PostRow[]>();

/**
 * Step 1, "start here": a series matching their tags, else their tags' most-read posts.
 * Without a match, readers who joined from an article get the most-read posts and
 * everyone else the newest series (made to be read from the start).
 */
async function startHereSections(subscriber: Pick<ISubscriber, 'tags' | 'source'>): Promise<WelcomeSeriesSection[]> {
  const matchers = topicMatchers(subscriber.tags);
  const sections: WelcomeSeriesSection[] = [];
  if (matchers.length) {
    const tagMatch = { $or: [{ tags: { $in: matchers } }, { category: { $in: matchers } }] };
    const series = await newestSeries(tagMatch);
    if (series) {
      sections.push({ heading: 'Start with this series', links: [{ title: series.title, url: `${APP_URL}/blog/series/${encodeURIComponent(series.slug)}`, description: series.description }] });
      return sections;
    }
    const posts = await topPosts(tagMatch);
    if (posts.length) return [{ heading: 'Start with these', links: posts.map(postLink) }];
  }

  if (!sourceTagsFor(subscriber.source).length) {
    const series = await newestSeries({});
    if (series) {
      sections.push({ heading: 'Start with this series', links: [{ title: series.title, url: `${APP_URL}/blog/series/${encodeURIComponent(series.slug)}`, description: series.description }] });
    }
  }
  const posts = await topPosts({});
  sections.push({
    heading: 'Most-read articles',
    links: posts.length ? posts.map(postLink) : [{ title: 'All articles', url: `${APP_URL}/blog` }],
  });
  return sections;
}

/** Step 2: the most relevant published course, plus the tools/products page. */
async function goDeeperSections(subscriber: Pick<ISubscriber, 'tags'>): Promise<WelcomeSeriesSection[]> {
  const matchers = topicMatchers(subscriber.tags);
  const select = 'title slug summary';
  const sort = { featured: -1, publishedAt: -1, createdAt: -1 } as const;
  let course = matchers.length
    ? await Course.findOne({ status: 'published', $or: [{ tags: { $in: matchers } }, { topic: { $in: matchers } }] })
      .select(select).sort(sort).lean<CourseRow>()
    : null;
  course ||= await Course.findOne({ status: 'published' }).select(select).sort(sort).lean<CourseRow>();

  return [
    {
      heading: 'Take a course',
      links: [course
        ? { title: course.title, url: `${APP_URL}/courses/${encodeURIComponent(course.slug)}`, description: course.summary }
        : { title: 'Browse the courses', url: `${APP_URL}/courses` }],
    },
    {
      heading: 'Tools',
      links: [{ title: 'Tools and products', url: `${APP_URL}/products`, description: 'Things we built and use ourselves.' }],
    },
  ];
}

async function buildStepSections(step: number, subscriber: Pick<ISubscriber, 'tags' | 'source'>) {
  return step === 1 ? startHereSections(subscriber) : goDeeperSections(subscriber);
}

// ---------------------------------------------------------------------------
// Sending (called from the newsletter scheduler)

export interface WelcomeSeriesRunResult {
  enabled: boolean;
  sent: number;
  failed: number;
  /** Set when the provider refused mail; the remaining subscribers stay due. */
  providerError?: string;
  /** Set by the scheduler when the run itself failed (e.g. a database error). */
  error?: string;
}

const statsKey = (date: Date) => `${STATS_KEY_PREFIX}${date.toISOString().slice(0, 10)}`;

async function recordRun(sent: number, failed: number) {
  if (!sent && !failed) return;
  try {
    await SiteSetting.updateOne({ key: statsKey(new Date()) }, { $inc: { 'value.sent': sent, 'value.failed': failed } }, { upsert: true });
  } catch (error) {
    console.error('Welcome series stats write failed:', error instanceof Error ? error.message : 'unknown error');
  }
}

/**
 * Sends due welcome-series steps, one subscriber at a time at the campaign send rate.
 * Each subscriber is claimed atomically (welcomeNextAt is pushed into the future), so
 * overlapping scheduler runs never email the same step twice.
 */
export async function sendDueWelcomeEmails(options: { deadline: number; limit?: number }): Promise<WelcomeSeriesRunResult> {
  const settings = await getWelcomeSeriesSettings();
  if (!settings.enabled) return { enabled: false, sent: 0, failed: 0 };

  const limit = Math.min(Math.max(options.limit || WELCOME_SENDS_PER_RUN, 1), WELCOME_SENDS_PER_RUN);
  const sendIntervalMs = 1000 / EMAIL_SEND_RATE;
  let nextSendAt = 0;
  let sent = 0;
  let failed = 0;
  let providerError: string | undefined;

  for (let index = 0; index < limit && Date.now() < options.deadline; index += 1) {
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + CLAIM_LEASE_MS);
    // Returns the document as it was before the claim, so a provider failure can put it back exactly.
    const claimed = await Subscriber.findOneAndUpdate(
      { status: 'confirmed', welcomeNextAt: { $lte: now } },
      { $set: { welcomeNextAt: leaseUntil } },
      { sort: { welcomeNextAt: 1 }, returnDocument: 'before' },
    )
      .select('email tags source confirmedAt welcomeStep welcomeNextAt')
      .lean<Pick<ISubscriber, 'email' | 'tags' | 'source' | 'confirmedAt' | 'welcomeStep' | 'welcomeNextAt'> & { _id: mongoose.Types.ObjectId }>();
    if (!claimed) break;

    const owned = { _id: claimed._id, welcomeNextAt: leaseUntil };
    const step = (claimed.welcomeStep ?? 0) + 1;
    const confirmedAt = claimed.confirmedAt ? new Date(claimed.confirmedAt).getTime() : now.getTime();
    if (step >= settings.steps.length || now.getTime() - confirmedAt > MAX_SERIES_AGE_MS) {
      await Subscriber.updateOne(owned, { $set: { welcomeNextAt: null } });
      continue;
    }

    try {
      const sections = await buildStepSections(step, claimed);
      const wait = nextSendAt - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      nextSendAt = Date.now() + sendIntervalMs;
      await sendWelcomeSeriesEmail(claimed, { step, subject: settings.steps[step].subject, intro: settings.steps[step].intro, sections });
      const following = settings.steps[step + 1];
      const nextAt = following
        ? new Date(Math.max(confirmedAt + following.delayDays * DAY_MS, Date.now() + MIN_STEP_GAP_MS))
        : null;
      await Subscriber.updateOne(owned, { $set: { welcomeStep: step, welcomeNextAt: nextAt } });
      sent += 1;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown send error';
      const kind = classifySendError(error);
      if (kind === 'provider' || kind === 'throttle' || kind === 'rate-limit') {
        // Not this reader's fault: leave them due as before and stop for this run.
        await Subscriber.updateOne(owned, { $set: { welcomeNextAt: claimed.welcomeNextAt } });
        providerError = `Email provider refused the welcome series: ${reason}`.slice(0, 1_000);
        break;
      }
      failed += 1;
      if (kind === 'recipient') {
        // A bounce ends the series for this reader; a dead mailbox is unsubscribed as for campaigns.
        await Subscriber.updateOne(owned, { $set: { welcomeNextAt: null } });
        if (MAILBOX_GONE_PATTERN.test(reason)) await suppressBouncedSubscriber(claimed._id);
      } else {
        await Subscriber.updateOne(owned, { $set: { welcomeNextAt: new Date(Date.now() + TRANSIENT_RETRY_MS) } });
      }
    }
  }

  await recordRun(sent, failed);
  return { enabled: true, sent, failed, providerError };
}

// ---------------------------------------------------------------------------
// Admin visibility

export interface WelcomeSeriesStats {
  /** Confirmed subscribers with a step still scheduled. */
  inProgress: number;
  sentLast7Days: number;
  failedLast7Days: number;
}

export async function getWelcomeSeriesStats(now: Date = new Date()): Promise<WelcomeSeriesStats> {
  const keys = Array.from({ length: 7 }, (_, offset) => statsKey(new Date(now.getTime() - offset * DAY_MS)));
  const [inProgress, days] = await Promise.all([
    Subscriber.countDocuments({ status: 'confirmed', welcomeNextAt: { $ne: null } }),
    SiteSetting.find({ key: { $in: keys } }).select('value').lean(),
  ]);
  const total = (field: 'sent' | 'failed') => days.reduce((sum, day) => {
    const value = (day.value || {}) as Record<string, unknown>;
    return sum + (typeof value[field] === 'number' ? (value[field] as number) : 0);
  }, 0);
  return { inProgress, sentLast7Days: total('sent'), failedLast7Days: total('failed') };
}
