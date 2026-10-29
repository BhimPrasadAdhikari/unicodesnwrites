import Subscriber from '@/lib/models/Subscriber';
import { BOUNCED_TAG, COMPLAINED_TAG } from '@/lib/utils/validations/subscriber';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// SES caps a message at 50 recipients; anything past this is not a real notification.
const MAX_RECIPIENTS_PER_EVENT = 100;
const CHUNK = 500;

/** The address the subscriber list stores (trimmed, lowercased), or null when it isn't one. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  // SES can report `"Name" <a@b.c>`; keep the address part.
  const email = (value.match(/<([^<>]+)>\s*$/)?.[1] ?? value).trim().toLowerCase();
  return email.length <= 254 && EMAIL.test(email) ? email : null;
}

export interface SuppressionResult {
  /** Subscribers found for the given addresses. */
  matched: number;
  /** Subscribers changed: unsubscribed, or newly tagged when already unsubscribed. */
  updated: number;
}

/**
 * Unsubscribes the subscribers with these addresses and tags them. Anyone already
 * unsubscribed keeps their original unsubscribedAt and only gains the tag.
 * Addresses must already be normalized.
 */
export async function suppressSubscriberEmails(emails: readonly string[], tag: string): Promise<SuppressionResult> {
  const unique = [...new Set(emails)];
  let matched = 0;
  let updated = 0;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    matched += await Subscriber.countDocuments({ email: { $in: chunk } });
    const active = await Subscriber.updateMany(
      { email: { $in: chunk }, status: { $ne: 'unsubscribed' } },
      { $set: { status: 'unsubscribed', unsubscribedAt: new Date() }, $addToSet: { tags: tag } },
    );
    const alreadyGone = await Subscriber.updateMany(
      { email: { $in: chunk }, status: 'unsubscribed', tags: { $ne: tag } },
      { $addToSet: { tags: tag } },
    );
    updated += active.modifiedCount + alreadyGone.modifiedCount;
  }
  return { matched, updated };
}

interface SesRecipient {
  emailAddress?: unknown;
}

/** The SES event or notification JSON carried in an SNS Notification's Message. */
export interface SesEvent {
  notificationType?: string;
  eventType?: string;
  bounce?: { bounceType?: string; bouncedRecipients?: SesRecipient[] };
  complaint?: { complaintFeedbackType?: string; complainedRecipients?: SesRecipient[] };
}

export interface SesEventOutcome {
  /** Bounce, Complaint, Delivery, ... or "unknown". */
  type: string;
  action: 'suppressed' | 'ignored';
  recipients: number;
  matched: number;
  updated: number;
}

/** Identity notifications use notificationType; configuration-set events use eventType. */
export const sesEventType = (event: SesEvent) => String(event?.notificationType || event?.eventType || 'unknown');

/** The event types that can change a subscriber. */
export const SES_ACTIONABLE_TYPES = new Set(['Bounce', 'Complaint']);

const recipientEmails =(recipients: unknown) =>
  (Array.isArray(recipients) ? recipients : [])
    .slice(0, MAX_RECIPIENTS_PER_EVENT)
    .map((recipient: SesRecipient) => normalizeEmail(recipient?.emailAddress))
    .filter((email): email is string => Boolean(email));

/**
 * Applies one SES notification. Permanent bounces and complaints unsubscribe the
 * recipients; transient bounces, deliveries and anything else are left alone.
 * Past NewsletterSend records are never rewritten.
 */
export async function applySesEvent(event: SesEvent): Promise<SesEventOutcome> {
  const type = sesEventType(event);
  const ignored = (recipients = 0): SesEventOutcome => ({ type, action: 'ignored', recipients, matched: 0, updated: 0 });

  if (type === 'Bounce') {
    const emails = recipientEmails(event.bounce?.bouncedRecipients);
    // Transient (mailbox full, throttled) and Undetermined bounces may deliver next time.
    if (event.bounce?.bounceType !== 'Permanent') return ignored(emails.length);
    return { type, action: 'suppressed', recipients: emails.length, ...(await suppressSubscriberEmails(emails, BOUNCED_TAG)) };
  }

  if (type === 'Complaint') {
    const emails = recipientEmails(event.complaint?.complainedRecipients);
    // A "not-spam" report is the recipient taking a complaint back.
    if (event.complaint?.complaintFeedbackType === 'not-spam') return ignored(emails.length);
    return { type, action: 'suppressed', recipients: emails.length, ...(await suppressSubscriberEmails(emails, COMPLAINED_TAG)) };
  }

  return ignored();
}

/**
 * Reads addresses from an uploaded list: a CSV whose header has an `email` (or
 * `EmailAddress`) column, or one address per line (first column if delimited).
 * Returns unique normalized addresses and how many non-empty entries were not addresses.
 */
export function parseEmailList(text: string): { emails: string[]; invalid: number } {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((line) => line.trim() !== '');
  const cells = (line: string) => line.split(/[,\t;]/).map((cell) => cell.trim().replace(/^"|"$/g, '').trim());

  let column = 0;
  let start = 0;
  if (lines.length) {
    const header = cells(lines[0]).map((cell) => cell.toLowerCase().replace(/[^a-z]/g, ''));
    const index = header.findIndex((cell) => cell === 'email' || cell === 'emailaddress');
    if (index !== -1) {
      column = index;
      start = 1;
    }
  }

  const emails = new Set<string>();
  let invalid = 0;
  for (const line of lines.slice(start)) {
    const email = normalizeEmail(cells(line)[column] ?? '');
    if (email) emails.add(email);
    else invalid++;
  }
  return { emails: [...emails], invalid };
}
