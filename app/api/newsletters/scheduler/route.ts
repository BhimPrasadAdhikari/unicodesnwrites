import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Newsletter, { IN_FLIGHT_STATUSES } from '@/lib/models/Newsletter';
import {
  NewsletterDeliveryError,
  startOrContinueNewsletterDelivery,
} from '@/lib/services/newsletter-delivery';
import crypto from 'crypto';

const DEFAULT_BATCH_SIZE = 100;
const MAX_NEWSLETTERS_PER_RUN = 25;
// Keep working through batches until this much of the function's time is used.
const RUN_TIME_BUDGET_MS = 45_000;

export const maxDuration = 60;

const safeEqual = (expectedValue: string, providedValue: string) => {
  const expected = Buffer.from(expectedValue);
  const provided = Buffer.from(providedValue);
  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
};

const getConfiguredSecrets = () =>
  [process.env.NEWSLETTER_SCHEDULER_SECRET, process.env.CRON_SECRET].filter((value): value is string => Boolean(value));

/**
 * Accepts either the custom `x-scheduler-secret` header (external cron
 * services) or `Authorization: Bearer $CRON_SECRET`, which Vercel Cron sends.
 */
const isAuthorized = (request: NextRequest) => {
  const configuredSecrets = getConfiguredSecrets();
  if (!configuredSecrets.length) {
    return false;
  }

  const headerSecret = request.headers.get('x-scheduler-secret');
  if (headerSecret && process.env.NEWSLETTER_SCHEDULER_SECRET && safeEqual(process.env.NEWSLETTER_SCHEDULER_SECRET, headerSecret)) {
    return true;
  }

  const authorization = request.headers.get('authorization');
  const bearer = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : null;
  return Boolean(bearer && configuredSecrets.some((secret) => safeEqual(secret, bearer)));
};

const parseBatchSize = (request: NextRequest) => {
  const raw = request.nextUrl.searchParams.get('batchSize');
  const parsed = raw ? Number(raw) : DEFAULT_BATCH_SIZE;

  if (!Number.isFinite(parsed)) {
    return DEFAULT_BATCH_SIZE;
  }

  return Math.min(Math.max(parsed, 1), 500);
};

async function runScheduler(request: NextRequest) {
  if (!getConfiguredSecrets().length) {
    return NextResponse.json(
      { error: 'Newsletter scheduler is not configured' },
      { status: 503 }
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized scheduler request' }, { status: 401 });
  }

  await dbConnect();

  const now = new Date();
  const batchSize = parseBatchSize(request);

  // Campaigns already in flight go first, oldest first; a paused one waits for its
  // resumeAfter. A scheduled campaign only starts once nothing else is in flight,
  // because every campaign draws on the same provider quota.
  const inFlight = await Newsletter.find({ status: { $in: IN_FLIGHT_STATUSES } })
    .sort({ sentAt: 1, updatedAt: 1 })
    .limit(MAX_NEWSLETTERS_PER_RUN)
    .lean();
  const dueCampaigns = inFlight.filter(
    (campaign) => campaign.status === 'sending' || !campaign.resumeAfter || campaign.resumeAfter <= now,
  );
  if (!inFlight.length) {
    const nextScheduled = await Newsletter.findOne({ status: 'scheduled', scheduledFor: { $lte: now } })
      .sort({ scheduledFor: 1 })
      .lean();
    if (nextScheduled) dueCampaigns.push(nextScheduled);
  }

  const processed: Array<{
    newsletterId: string;
    status: string;
    pendingCount: number;
    sentCount: number;
    failedCount: number;
    processedCount: number;
  }> = [];

  const errors: Array<{ newsletterId: string; error: string }> = [];

  const startedAt = Date.now();
  for (const campaign of dueCampaigns) {
    if (Date.now() - startedAt > RUN_TIME_BUDGET_MS) break;
    try {
      // Keep sending batches for this campaign until the queue drains, the
      // provider pushes back, or the run's time budget is used up.
      let result;
      let processedCount = 0;
      do {
        result = await startOrContinueNewsletterDelivery(campaign._id.toString(), {
          batchSize,
          allowScheduledStart: true,
          now,
        });
        processedCount += result.processedCount;
      } while (
        result.status === 'sending'
        && result.pendingCount > 0
        && result.processedCount > 0
        && !result.providerError
        && Date.now() - startedAt < RUN_TIME_BUDGET_MS
      );

      processed.push({
        newsletterId: result.newsletterId,
        status: result.status,
        pendingCount: result.pendingCount,
        sentCount: result.sentCount,
        failedCount: result.failedCount,
        processedCount,
      });
      if (result.providerError) {
        errors.push({ newsletterId: result.newsletterId, error: result.providerError });
        break; // the provider is refusing mail; don't hammer it with other campaigns
      }
    } catch (error) {
      const message =
        error instanceof NewsletterDeliveryError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Unknown scheduler error';

      errors.push({ newsletterId: campaign._id.toString(), error: message });
    }
  }

  return NextResponse.json({
    runAt: now.toISOString(),
    consideredCampaigns: dueCampaigns.length,
    waitingCampaigns: inFlight.length - dueCampaigns.filter((campaign) => campaign.status !== 'scheduled').length,
    processed,
    errors,
  });
}

export async function GET(request: NextRequest) {
  return runScheduler(request);
}

export async function POST(request: NextRequest) {
  return runScheduler(request);
}
