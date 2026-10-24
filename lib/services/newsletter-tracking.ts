import crypto from 'crypto';
import type { Types } from 'mongoose';

import Newsletter from '@/lib/models/Newsletter';
import NewsletterSend from '@/lib/models/NewsletterSend';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.unicodesnwrites.tech';

// Signing key for tracking links; derived so it never equals another secret.
const KEY = crypto
  .createHash('sha256')
  .update(`newsletter-tracking:${process.env.NEXTAUTH_SECRET || process.env.NEWSLETTER_UNSUBSCRIBE_SECRET || 'dev-only'}`)
  .digest();

const sign = (value: string) => crypto.createHmac('sha256', KEY).update(value).digest('base64url').slice(0, 22);

export function verifySignature(value: string, signature: string | null) {
  if (!signature) return false;
  const expected = Buffer.from(sign(value));
  const given = Buffer.from(signature);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

export const openPixelUrl = (sendId: string) => `${APP_URL}/api/newsletters/track/open?s=${sendId}&t=${sign(`open:${sendId}`)}`;

export const trackedLinkUrl = (sendId: string, url: string) =>
  `${APP_URL}/api/newsletters/track/click?s=${sendId}&u=${encodeURIComponent(url)}&t=${sign(`click:${sendId}:${url}`)}`;

export const clickSignatureValue = (sendId: string, url: string) => `click:${sendId}:${url}`;
export const openSignatureValue = (sendId: string) => `open:${sendId}`;

/**
 * Routes the email's web links through the click counter and adds an open pixel.
 * Unsubscribe and mailto links are left alone so they always work directly.
 */
export function addTracking(html: string, sendId: string) {
  const withLinks = html.replace(/href="(https?:\/\/[^"]+)"/g, (match, rawUrl: string) => {
    const url = rawUrl.replace(/&amp;/g, '&');
    if (/\/unsubscribe/i.test(url)) return match;
    return `href="${trackedLinkUrl(sendId, url).replace(/&/g, '&amp;')}"`;
  });
  const pixel = `<img src="${openPixelUrl(sendId).replace(/&/g, '&amp;')}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0" />`;
  return withLinks.includes('</body>') ? withLinks.replace('</body>', `${pixel}</body>`) : `${withLinks}${pixel}`;
}

/**
 * Records the first open (and, for a click, the first click) of one delivery and
 * bumps the campaign's counters once per recipient. A click implies an open:
 * image blocking hides many real opens.
 */
export async function recordEngagement(sendId: string, kind: 'open' | 'click') {
  const now = new Date();
  const opened = await NewsletterSend.findOneAndUpdate(
    { _id: sendId, status: 'sent', openedAt: { $exists: false } },
    { $set: { openedAt: now } },
    { projection: { newsletter: 1 } },
  ).lean<{ newsletter: Types.ObjectId } | null>();
  if (opened) await Newsletter.updateOne({ _id: opened.newsletter }, { $inc: { openedCount: 1 } }, { timestamps: false });

  if (kind === 'click') {
    const clicked = await NewsletterSend.findOneAndUpdate(
      { _id: sendId, status: 'sent', clickedAt: { $exists: false } },
      { $set: { clickedAt: now } },
      { projection: { newsletter: 1 } },
    ).lean<{ newsletter: Types.ObjectId } | null>();
    if (clicked) await Newsletter.updateOne({ _id: clicked.newsletter }, { $inc: { clickedCount: 1 } }, { timestamps: false });
  }
}
