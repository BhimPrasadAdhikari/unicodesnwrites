import crypto from 'crypto';
import mongoose from 'mongoose';

import dbConnect from '@/lib/db/connection';
import Newsletter, { IN_FLIGHT_STATUSES, type NewsletterStatus } from '@/lib/models/Newsletter';
import NewsletterSend from '@/lib/models/NewsletterSend';
import Subscriber from '@/lib/models/Subscriber';
import { EMAIL_MAX_CONNECTIONS, EMAIL_SEND_RATE, sendNewsletterToSubscriber } from '@/lib/services/email';
import { findCommittedCampaignsForPosts, loadPostsForNewsletter } from '@/lib/services/newsletter-content';
import { campaignAudienceFilter, countCampaignAudience } from '@/lib/services/subscriber-tags';
import { isPostLive } from '@/lib/utils/post-visibility';

const UPSERT_CHUNK_SIZE = 500;
const MAX_DELIVERY_ATTEMPTS = 3;
const DELIVERY_LEASE_MS = 2 * 60 * 1000;
const PROVIDER_BACKOFF_MS = 60 * 60 * 1000;
const PROVIDER_ERROR_BACKOFF_MS = 5 * 60 * 1000;
const CANCELLATION_CHECK_INTERVAL = 20;
const INITIALIZATION_WAIT_MS = 10_000;
// Sends in flight at once. The transport's rate limit, not this, caps messages per second.
const SEND_CONCURRENCY = Math.min(Math.max(EMAIL_MAX_CONNECTIONS, 1), 20);
// A per-second throttle is retried after a short wait; this many in one batch pauses the campaign.
const MAX_THROTTLES_PER_BATCH = 20;
const THROTTLE_WAIT_MS = 2_000;

export interface NewsletterDeliveryResult {
  newsletterId: string;
  status: NewsletterStatus;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  processedCount: number;
  batchSize: number;
  /** Set when the email provider rejected the whole batch (bad credentials, quota, outage). */
  providerError?: string;
  /** When a paused campaign becomes due again. */
  resumeAfter?: Date;
}

export class NewsletterDeliveryError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'NewsletterDeliveryError';
    this.statusCode = statusCode;
  }
}

type SendFailureKind = 'provider' | 'throttle' | 'rate-limit' | 'recipient' | 'transient';

/**
 * Sorts SMTP/Nodemailer errors into failures that are the provider's fault
 * (stop the whole batch, don't burn per-recipient attempts), hard bounces
 * (never retry), and ordinary transient errors (retry with backoff).
 */
export function classifySendError(error: unknown): SendFailureKind {
  const err = (error && typeof error === 'object' ? error : {}) as { code?: string; responseCode?: number; message?: string; response?: string };
  const text = `${err.message || ''} ${err.response || ''}`;
  if (err.message === 'EMAIL_NOT_CONFIGURED' || err.message === 'EMAIL_SKIPPED' || err.code === 'EAUTH' || err.code === 'ENOAUTH' || err.responseCode === 535) {
    return 'provider';
  }
  // Amazon SES refuses everything while the sender's domain is unverified or the account is paused:
  // the provider's fault, so pause the queue rather than burn every reader's retries.
  if (/not verified|sending paused|account is (?:paused|suspended)/i.test(text)) {
    return 'provider';
  }
  // Sending a little too fast for the per-second cap: slow down and retry, don't pause for an hour.
  if (/maximum sending rate exceeded|throttling failure/i.test(text) && !/quota/i.test(text)) {
    return 'throttle';
  }
  if (err.responseCode === 421 || err.responseCode === 454 || /5\.4\.5|quota|rate limit|too many/i.test(text)) {
    return 'rate-limit';
  }
  if (err.code === 'ECONNECTION' || err.code === 'ETIMEDOUT' || err.code === 'EDNS' || err.code === 'ESOCKET') {
    return 'provider';
  }
  if (err.code === 'EENVELOPE' || (typeof err.responseCode === 'number' && err.responseCode >= 550 && err.responseCode <= 553)) {
    return 'recipient';
  }
  return 'transient';
}

/**
 * A bounce saying the mailbox does not exist. Other 55x bounces (spam policy,
 * full mailbox) can clear up, so only these stop future sends.
 */
export const MAILBOX_GONE_PATTERN = /5\.1\.1|5\.1\.10|user unknown|unknown user|no such user|does not exist|doesn't exist|address rejected|recipient not found|mailbox not found|mailbox unavailable|invalid recipient|nosuchuser/i;

/** Failed or bounced sends whose reason says the mailbox does not exist. */
export const mailboxGoneSendFilter = () => ({
  status: { $in: ['failed', 'bounced'] as Array<'failed' | 'bounced'> },
  failureReason: { $regex: MAILBOX_GONE_PATTERN.source, $options: 'i' },
});

/** Unsubscribes the address so later issues don't spend sending quota on it. */
export async function suppressBouncedSubscriber(subscriberId: mongoose.Types.ObjectId) {
  await Subscriber.updateOne(
    { _id: subscriberId, status: 'confirmed' },
    { $set: { status: 'unsubscribed', unsubscribedAt: new Date(), welcomeNextAt: null }, $addToSet: { tags: 'bounced' } },
  );
}

/**
 * Guards against emailing an article twice and against emailing an article
 * readers can't open yet. `at` is when the campaign will go out.
 */
export async function assertCampaignPostsSendable(
  newsletter: { _id: unknown; posts?: mongoose.Types.ObjectId[] },
  at: Date = new Date(),
) {
  const postIds = newsletter.posts || [];
  if (!postIds.length) return;
  const committed = await findCommittedCampaignsForPosts(postIds, {
    excludeNewsletterId: newsletter._id as mongoose.Types.ObjectId,
  });
  if (committed.size) {
    const campaign = committed.values().next().value!;
    throw new NewsletterDeliveryError(
      `An article in this campaign was already emailed in "${campaign.subject}" (${campaign.status}).`,
      409,
    );
  }
  const posts = await loadPostsForNewsletter(postIds);
  if (posts.length !== postIds.length) {
    throw new NewsletterDeliveryError('An article in this campaign was deleted.', 409);
  }
  const notLive = posts.find((post) => !isPostLive(post, at));
  if (notLive) {
    throw new NewsletterDeliveryError(`"${notLive.title}" is not published yet at the send time.`, 409);
  }
}

const countByStatus = (rows: Array<{ _id: string; count: number }>, status: string) =>
  rows.find((row) => row._id === status)?.count || 0;

// Confirmed subscribers, narrowed to the campaign's audience tags when it has any. Bounce
// clean-up already unsubscribes a dead address.
const initializeDeliveryQueue = async (newsletterId: mongoose.Types.ObjectId, audienceTags?: string[]) => {
  const subscribers = await Subscriber.find(campaignAudienceFilter(audienceTags)).select('_id email').lean();
  for (let index = 0; index < subscribers.length; index += UPSERT_CHUNK_SIZE) {
    const chunk = subscribers.slice(index, index + UPSERT_CHUNK_SIZE);
    if (!chunk.length) continue;
    const operations = chunk.map((subscriber) => ({
      updateOne: {
        filter: { newsletter: newsletterId, subscriber: subscriber._id },
        update: {
          $setOnInsert: {
            newsletter: newsletterId,
            subscriber: subscriber._id,
            email: subscriber.email,
            status: 'pending' as const,
            attemptCount: 0,
          },
        },
        upsert: true,
      },
    }));
    try {
      await NewsletterSend.bulkWrite(operations, { ordered: false });
    } catch (error) {
      // Concurrent queue initialization can race on the unique recipient index.
      // Duplicate-key rows are already present and safe to continue with.
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) throw error;
    }
  }
  return NewsletterSend.countDocuments({ newsletter: newsletterId });
};

const summarizeDelivery = async (newsletterId: mongoose.Types.ObjectId) => {
  const rows = await NewsletterSend.aggregate([
    { $match: { newsletter: newsletterId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const sentCount = countByStatus(rows, 'sent');
  const pendingCount = countByStatus(rows, 'pending') + countByStatus(rows, 'processing');
  const failedCount = countByStatus(rows, 'failed') + countByStatus(rows, 'bounced');
  return { sentCount, pendingCount, failedCount };
};

async function claimNextDelivery(newsletterId: mongoose.Types.ObjectId, now: Date) {
  const leaseToken = crypto.randomUUID();
  const send = await NewsletterSend.findOneAndUpdate(
    {
      newsletter: newsletterId,
      $or: [
        {
          status: 'pending',
          $or: [{ nextAttemptAt: { $exists: false } }, { nextAttemptAt: { $lte: now } }],
        },
        { status: 'processing', leaseExpiresAt: { $lte: now } },
      ],
    },
    {
      $set: {
        status: 'processing',
        leaseToken,
        leaseExpiresAt: new Date(now.getTime() + DELIVERY_LEASE_MS),
        lastAttemptAt: now,
      },
      $inc: { attemptCount: 1 },
      $unset: { nextAttemptAt: 1 },
    },
    { new: true, sort: { createdAt: 1 } },
  ).lean();
  return send ? { send, leaseToken } : null;
}

async function markPermanentFailure(id: mongoose.Types.ObjectId, leaseToken: string, reason: string) {
  await NewsletterSend.updateOne(
    { _id: id, status: 'processing', leaseToken },
    {
      $set: { status: 'failed', failureReason: reason.slice(0, 1_000) },
      $unset: { leaseToken: 1, leaseExpiresAt: 1, nextAttemptAt: 1 },
    },
  );
}

// Failures that retrying can't fix. Everything else is requeued, including quota
// rejections that were recorded as failures before rate limits were classified.
const NON_RETRYABLE_FAILURE = /^Subscriber is no longer confirmed$/;

async function requeueFailedDeliveries(newsletterId: mongoose.Types.ObjectId, now: Date) {
  return NewsletterSend.updateMany(
    { newsletter: newsletterId, status: 'failed', failureReason: { $not: NON_RETRYABLE_FAILURE } },
    {
      $set: { status: 'pending', attemptCount: 0, nextAttemptAt: now },
      $unset: { leaseToken: 1, leaseExpiresAt: 1, failureReason: 1 },
    },
  );
}

/** Another campaign whose queue is still open, if any. */
export async function findOtherInFlightCampaign(newsletterId: mongoose.Types.ObjectId) {
  return Newsletter.findOne({ _id: { $ne: newsletterId }, status: { $in: IN_FLIGHT_STATUSES } })
    .select('subject status')
    .lean();
}

/**
 * Stops a campaign that is sending or paused. Recipients already sent stay
 * sent; pending ones are never delivered.
 */
export async function cancelNewsletterDelivery(newsletterId: string) {
  await dbConnect();
  const cancelled = await Newsletter.findOneAndUpdate(
    { _id: newsletterId, status: { $in: IN_FLIGHT_STATUSES } },
    { $set: { status: 'cancelled' }, $unset: { resumeAfter: 1, pausedReason: 1 } },
    { new: true },
  );
  if (!cancelled) {
    const existing = await Newsletter.findById(newsletterId).select('status').lean();
    if (!existing) throw new NewsletterDeliveryError('Newsletter not found', 404);
    throw new NewsletterDeliveryError('Only a sending or paused campaign can be stopped', 400);
  }
  const summary = await summarizeDelivery(cancelled._id as mongoose.Types.ObjectId);
  await Newsletter.updateOne({ _id: cancelled._id }, { $set: { sentCount: summary.sentCount, failedCount: summary.failedCount } });
  return { newsletterId, status: 'cancelled' as const, recipientCount: cancelled.recipientCount, ...summary };
}

export async function startOrContinueNewsletterDelivery(
  newsletterId: string,
  options?: {
    batchSize?: number;
    allowScheduledStart?: boolean;
    retryFailed?: boolean;
    /** Resume a paused campaign before its `resumeAfter` (an admin clicked send). */
    resumePaused?: boolean;
    now?: Date;
    /** Epoch ms: stop claiming new recipients after this, so the request ends before the platform kills it. */
    deadline?: number;
  },
): Promise<NewsletterDeliveryResult> {
  await dbConnect();
  const batchSize = Math.min(Math.max(options?.batchSize || 50, 1), 500);
  const now = options?.now || new Date();
  let newsletter = await Newsletter.findById(newsletterId);
  if (!newsletter) throw new NewsletterDeliveryError('Newsletter not found', 404);
  const newsletterObjectId = newsletter._id as mongoose.Types.ObjectId;

  if (newsletter.status === 'cancelled') {
    throw new NewsletterDeliveryError('This campaign was stopped and cannot be sent again', 400);
  }

  if (['sent', 'failed', 'sending', 'paused'].includes(newsletter.status) && options?.retryFailed) {
    if (newsletter.status === 'sent' || newsletter.status === 'failed') {
      const other = await findOtherInFlightCampaign(newsletterObjectId);
      if (other) {
        throw new NewsletterDeliveryError(`"${other.subject}" is still ${other.status}. Retry this campaign once it finishes or is stopped.`, 409);
      }
    }
    const retryable = await requeueFailedDeliveries(newsletterObjectId, now);
    if (!retryable.modifiedCount) {
      throw new NewsletterDeliveryError('There are no retryable failed deliveries', 400);
    }
    if (newsletter.status === 'sent' || newsletter.status === 'failed') newsletter.status = 'sending';
    newsletter.failedCount = Math.max(0, newsletter.failedCount - retryable.modifiedCount);
    await newsletter.save();
  } else if (newsletter.status === 'sent') {
    const summary = await summarizeDelivery(newsletterObjectId);
    return { newsletterId, status: 'sent', recipientCount: newsletter.recipientCount || summary.sentCount + summary.failedCount, ...summary, processedCount: 0, batchSize };
  }
  if (newsletter.status === 'paused') {
    if (!options?.resumePaused && newsletter.resumeAfter && newsletter.resumeAfter > now) {
      const summary = await summarizeDelivery(newsletterObjectId);
      return {
        newsletterId,
        status: 'paused',
        recipientCount: newsletter.recipientCount,
        ...summary,
        processedCount: 0,
        batchSize,
        providerError: newsletter.pausedReason,
        resumeAfter: newsletter.resumeAfter,
      };
    }
    const resumed = await Newsletter.findOneAndUpdate(
      { _id: newsletterObjectId, status: 'paused' },
      { $set: { status: 'sending' }, $unset: { pausedReason: 1, resumeAfter: 1 } },
      { new: true },
    );
    newsletter = resumed || (await Newsletter.findById(newsletterObjectId));
    if (!newsletter) throw new NewsletterDeliveryError('Newsletter not found', 404);
  }

  if (!['draft', 'scheduled', 'sending'].includes(newsletter.status)) {
    throw new NewsletterDeliveryError('Newsletter cannot be sent in its current status', 400);
  }
  if (newsletter.status === 'scheduled') {
    if (!options?.allowScheduledStart) throw new NewsletterDeliveryError('Scheduled newsletter requires scheduler or explicit override', 400);
    if (newsletter.scheduledFor && newsletter.scheduledFor > now) throw new NewsletterDeliveryError('Newsletter is scheduled for a future time', 400);
  }

  if (newsletter.status === 'draft' || newsletter.status === 'scheduled') {
    await assertCampaignPostsSendable(newsletter, now);
    // A tagged audience nobody is in would "send" to no one and still mark its articles as emailed.
    if (newsletter.audienceTags?.length && !(await countCampaignAudience(newsletter.audienceTags))) {
      throw new NewsletterDeliveryError('No confirmed subscribers have the tags this campaign is limited to.', 409);
    }
    // One campaign at a time: they all draw on the same provider quota.
    const blocking = await findOtherInFlightCampaign(newsletterObjectId);
    if (blocking) {
      throw new NewsletterDeliveryError(
        `"${blocking.subject}" is still ${blocking.status}. Only one campaign can send at a time; schedule this one or wait until that one finishes or is stopped.`,
        409,
      );
    }
    const previousStatus = newsletter.status;
    const transitioned = await Newsletter.findOneAndUpdate(
      { _id: newsletterObjectId, status: newsletter.status },
      {
        $set: {
          status: 'sending',
          sentAt: newsletter.sentAt || now,
          recipientCount: 0,
          sentCount: 0,
          failedCount: 0,
        },
        $unset: {
          deliveryInitializedAt: 1,
          deliveryInitializationToken: 1,
          deliveryInitializationLeaseExpiresAt: 1,
        },
      },
      { new: true },
    );
    if (transitioned && (await findOtherInFlightCampaign(newsletterObjectId))) {
      // Another campaign started in the same instant; back out rather than share the quota.
      await Newsletter.updateOne({ _id: newsletterObjectId, status: 'sending' }, { $set: { status: previousStatus } });
      throw new NewsletterDeliveryError('Another campaign started sending at the same time. Try again once it finishes.', 409);
    }
    newsletter = transitioned || (await Newsletter.findById(newsletterObjectId));
    if (!newsletter) throw new NewsletterDeliveryError('Newsletter not found', 404);
  }

  if (!newsletter.deliveryInitializedAt) {
    const initializationToken = crypto.randomUUID();
    const claimedInitialization = await Newsletter.findOneAndUpdate(
      {
        _id: newsletterObjectId,
        status: 'sending',
        deliveryInitializedAt: { $exists: false },
        $or: [
          { deliveryInitializationLeaseExpiresAt: { $exists: false } },
          { deliveryInitializationLeaseExpiresAt: { $lte: now } },
        ],
      },
      {
        $set: {
          deliveryInitializationToken: initializationToken,
          deliveryInitializationLeaseExpiresAt: new Date(now.getTime() + DELIVERY_LEASE_MS),
        },
      },
      { new: true },
    ).lean();

    if (claimedInitialization?.deliveryInitializationToken === initializationToken) {
      const recipientCount = await initializeDeliveryQueue(newsletterObjectId, newsletter.audienceTags);
      await Newsletter.updateOne(
        { _id: newsletterObjectId, status: 'sending', deliveryInitializationToken: initializationToken },
        {
          $set: { recipientCount, deliveryInitializedAt: new Date() },
          $unset: { deliveryInitializationToken: 1, deliveryInitializationLeaseExpiresAt: 1 },
        },
      );
      newsletter.recipientCount = recipientCount;
      newsletter.deliveryInitializedAt = new Date();
    } else {
      const deadline = Date.now() + INITIALIZATION_WAIT_MS;
      let initialized = null;
      while (Date.now() < deadline) {
        initialized = await Newsletter.findById(newsletterObjectId)
          .select('recipientCount deliveryInitializedAt status')
          .lean();
        if (initialized?.deliveryInitializedAt) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (!initialized?.deliveryInitializedAt) {
        throw new NewsletterDeliveryError('Newsletter delivery queue is still initializing', 503);
      }
      newsletter.recipientCount = initialized.recipientCount;
      newsletter.deliveryInitializedAt = initialized.deliveryInitializedAt;
    }
  }

  let processedCount = 0;
  let providerError: string | undefined;
  let resumeAfter: Date | undefined;
  let stopped = false;
  let claimsSinceStatusCheck = 0;
  let throttles = 0;
  // Sends are spaced evenly across all workers, and spaced further after a throttle.
  let sendIntervalMs = 1000 / EMAIL_SEND_RATE;
  let nextSendAt = 0;
  let throttledUntil = 0;
  const waitForSendSlot = async () => {
    const now = Date.now();
    const at = Math.max(now, nextSendAt, throttledUntil);
    nextSendAt = at + sendIntervalMs;
    if (at > now) await new Promise((resolve) => setTimeout(resolve, at - now));
  };

  const deliverClaimed = async (claimed: NonNullable<Awaited<ReturnType<typeof claimNextDelivery>>>) => {
    const { send, leaseToken } = claimed;
    try {
      const subscriber = await Subscriber.findById(send.subscriber);
      if (!subscriber || subscriber.status !== 'confirmed') {
        await markPermanentFailure(send._id, leaseToken, 'Subscriber is no longer confirmed');
        return;
      }
      await waitForSendSlot();
      await sendNewsletterToSubscriber(newsletter, subscriber, String(send._id));
      await NewsletterSend.updateOne(
        { _id: send._id, status: 'processing', leaseToken },
        {
          $set: { status: 'sent', sentAt: new Date() },
          $unset: { leaseToken: 1, leaseExpiresAt: 1, nextAttemptAt: 1, failureReason: 1 },
        },
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown send error';
      let kind = classifySendError(error);
      if (kind === 'throttle') {
        throttles += 1;
        if (throttles <= MAX_THROTTLES_PER_BATCH) {
          // Give the attempt back and retry this recipient shortly, at a slower pace.
          throttledUntil = Date.now() + THROTTLE_WAIT_MS;
          sendIntervalMs = Math.min(sendIntervalMs * 1.5, 1000);
          await NewsletterSend.updateOne(
            { _id: send._id, status: 'processing', leaseToken },
            {
              $set: { status: 'pending', nextAttemptAt: new Date(Date.now() + THROTTLE_WAIT_MS) },
              $inc: { attemptCount: -1 },
              $unset: { leaseToken: 1, leaseExpiresAt: 1 },
            },
          );
          return;
        }
        kind = 'provider'; // still throttled after slowing down: pause briefly
      }
      if (kind === 'provider' || kind === 'rate-limit') {
        // Not this recipient's fault: give the attempt back, pause the queue and stop the batch.
        stopped = true;
        providerError = kind === 'rate-limit'
          ? `Email provider is rate limiting or over quota: ${reason}`
          : `Email provider rejected the send: ${reason}`;
        resumeAfter = new Date(Date.now() + (kind === 'rate-limit' ? PROVIDER_BACKOFF_MS : PROVIDER_ERROR_BACKOFF_MS));
        await NewsletterSend.updateOne(
          { _id: send._id, status: 'processing', leaseToken },
          {
            $set: {
              status: 'pending',
              failureReason: providerError.slice(0, 1_000),
              nextAttemptAt: resumeAfter,
            },
            $inc: { attemptCount: -1 },
            $unset: { leaseToken: 1, leaseExpiresAt: 1 },
          },
        );
        return;
      }
      if (kind === 'recipient') {
        await NewsletterSend.updateOne(
          { _id: send._id, status: 'processing', leaseToken },
          {
            $set: { status: 'bounced', failureReason: reason.slice(0, 1_000) },
            $unset: { leaseToken: 1, leaseExpiresAt: 1, nextAttemptAt: 1 },
          },
        );
        if (MAILBOX_GONE_PATTERN.test(reason)) await suppressBouncedSubscriber(send.subscriber);
        return;
      }
      if (send.attemptCount >= MAX_DELIVERY_ATTEMPTS) {
        await markPermanentFailure(send._id, leaseToken, reason);
      } else {
        const retryDelayMinutes = 2 ** Math.max(0, send.attemptCount - 1);
        await NewsletterSend.updateOne(
          { _id: send._id, status: 'processing', leaseToken },
          {
            $set: {
              status: 'pending',
              failureReason: reason.slice(0, 1_000),
              nextAttemptAt: new Date(Date.now() + retryDelayMinutes * 60 * 1000),
            },
            $unset: { leaseToken: 1, leaseExpiresAt: 1 },
          },
        );
      }
    }
  };

  // Several workers send at once; the SMTP pool's rate limit keeps the total under
  // the provider's per-second cap. Each claim is leased, so workers never share a recipient.
  const worker = async () => {
    while (!stopped && processedCount < batchSize) {
      // Unclaimed recipients stay pending for the next run.
      if (options?.deadline && Date.now() >= options.deadline) break;
      claimsSinceStatusCheck += 1;
      if (claimsSinceStatusCheck >= CANCELLATION_CHECK_INTERVAL) {
        claimsSinceStatusCheck = 0;
        const current = await Newsletter.findById(newsletterObjectId).select('status').lean();
        if (current?.status !== 'sending') { stopped = true; break; } // stopped by an admin mid-batch
      }
      processedCount += 1; // reserve the slot before awaiting, so workers can't overshoot batchSize
      const claimed = await claimNextDelivery(newsletterObjectId, new Date());
      if (!claimed) { processedCount -= 1; break; }
      await deliverClaimed(claimed);
    }
  };
  await Promise.all(Array.from({ length: Math.min(SEND_CONCURRENCY, batchSize) }, worker));

  const summary = await summarizeDelivery(newsletterObjectId);
  const computedStatus: NewsletterStatus = summary.pendingCount > 0
    ? providerError ? 'paused' : 'sending'
    : summary.failedCount > 0 && summary.sentCount === 0 ? 'failed' : 'sent';
  const recipientCount = newsletter.recipientCount || summary.sentCount + summary.failedCount + summary.pendingCount;
  const counts = {
    sentCount: summary.sentCount,
    failedCount: summary.failedCount,
    sentAt: newsletter.sentAt || now,
    recipientCount,
  };
  // Never overwrite a campaign an admin stopped while this batch was running.
  const finalizeFilter = summary.pendingCount > 0
    ? { _id: newsletterObjectId, status: { $nin: ['sent', 'failed', 'cancelled'] as NewsletterStatus[] } }
    : { _id: newsletterObjectId, status: { $ne: 'cancelled' as NewsletterStatus } };
  await Newsletter.updateOne(
    finalizeFilter,
    computedStatus === 'paused'
      ? { $set: { status: computedStatus, pausedReason: providerError!.slice(0, 1_000), resumeAfter, ...counts } }
      : { $set: { status: computedStatus, ...counts }, $unset: { pausedReason: 1, resumeAfter: 1 } },
  );
  const finalNewsletter = await Newsletter.findById(newsletterObjectId).select('status recipientCount resumeAfter').lean();
  return {
    newsletterId,
    status: finalNewsletter?.status || computedStatus,
    recipientCount: finalNewsletter?.recipientCount || recipientCount,
    ...summary,
    processedCount,
    batchSize,
    providerError,
    resumeAfter: finalNewsletter?.resumeAfter || resumeAfter,
  };
}
