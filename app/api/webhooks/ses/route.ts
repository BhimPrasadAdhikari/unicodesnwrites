import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import WebhookEvent from '@/lib/models/WebhookEvent';
import { applySesEvent, SES_ACTIONABLE_TYPES, SesEvent, sesEventType } from '@/lib/services/ses-bounce-sync';
import { isSnsUrl, verifySnsMessage } from '@/lib/services/sns-verify.mjs';

// Amazon SNS delivers SES bounce and complaint notifications here (see
// docs/ses-bounce-sync.md). SNS messages are at most 256 KB.
const MAX_BYTES = 300 * 1024;

interface SnsMessage {
  Type?: string;
  MessageId?: string;
  TopicArn?: string;
  Message?: string;
  SubscribeURL?: string;
  [key: string]: unknown;
}

async function confirmSubscription(message: SnsMessage) {
  if (!isSnsUrl(message.SubscribeURL)) {
    console.error('SES webhook: SubscribeURL is not an SNS endpoint; subscription not confirmed');
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }
  try {
    const response = await fetch(message.SubscribeURL!, { redirect: 'error', signal: AbortSignal.timeout(5_000) });
    if (!response.ok) throw new Error(`SNS returned ${response.status}`);
    console.log(`SES webhook: confirmed SNS subscription to ${message.TopicArn}`);
    return NextResponse.json({ status: 'confirmed' });
  } catch (error) {
    // SNS resends the confirmation request, so a failure here can retry.
    console.error('SES webhook: subscription confirmation failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Confirmation failed' }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const topicArn = process.env.SES_SNS_TOPIC_ARN?.trim();
  if (!topicArn) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  if (Number(req.headers.get('content-length') || 0) > MAX_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }
  const rawBody = await req.text();
  if (rawBody.length > MAX_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  let message: SnsMessage;
  try {
    message = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (!(await verifySnsMessage(message, { topicArn }))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  if (message.Type === 'SubscriptionConfirmation') return confirmSubscription(message);
  if (message.Type === 'UnsubscribeConfirmation') {
    console.warn(`SES webhook: SNS subscription to ${message.TopicArn} was removed`);
    return NextResponse.json({ status: 'ok' });
  }
  if (message.Type !== 'Notification' || !message.MessageId) {
    return NextResponse.json({ status: 'ignored' });
  }

  const eventId = message.MessageId;
  let event: SesEvent;
  try {
    event = JSON.parse(message.Message || '');
  } catch {
    // Signed by our topic but not SES JSON; retrying won't change that.
    console.warn(`SES webhook: notification ${eventId} has no SES event`);
    return NextResponse.json({ status: 'ignored' });
  }
  // Deliveries, SES's own test notification and other event types need no database work.
  if (!SES_ACTIONABLE_TYPES.has(sesEventType(event))) {
    return NextResponse.json({ status: 'ignored' });
  }

  try {
    await dbConnect();
    if (await WebhookEvent.exists({ provider: 'ses', eventId })) {
      return NextResponse.json({ status: 'duplicate' });
    }

    const outcome = await applySesEvent(event);
    // Counts only: subscriber addresses never go to the logs or the response.
    if (outcome.action === 'suppressed') {
      console.log(`SES webhook: ${outcome.type} for ${outcome.recipients} recipient(s); ${outcome.matched} subscriber(s) matched, ${outcome.updated} updated`);
    } else if (outcome.type === 'Bounce') {
      console.log(`SES webhook: ignored non-permanent bounce for ${outcome.recipients} recipient(s)`);
    }

    // Recorded only after the changes above committed, so a failed delivery is retried.
    await WebhookEvent.create({ provider: 'ses', eventId, event: outcome.type.slice(0, 40) }).catch((error) => {
      if (error?.code !== 11000) throw error;
    });

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error(`SES webhook ${eventId} failed:`, error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
