import { NextResponse } from 'next/server';
import { isValidObjectId, Types } from 'mongoose';

import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { connectDB } from '@/lib/db/connection';
import NewsletterSend from '@/lib/models/NewsletterSend';
import Subscriber from '@/lib/models/Subscriber';
import { mailboxGoneSendFilter } from '@/lib/services/newsletter-delivery';

/**
 * Unsubscribes every confirmed subscriber whose address bounced because the
 * mailbox does not exist, so later issues stop spending sending quota on them.
 * They are tagged "bounced" and can be re-confirmed from the Subscribers page.
 */
export async function POST(request: Request) {
  try {
    await requireAdminSession();
    // Optional: limit to one issue's bounces (the campaign report sends its id).
    const body = (await request.json().catch(() => ({}))) as { newsletterId?: unknown };
    const newsletterId = typeof body.newsletterId === 'string' && isValidObjectId(body.newsletterId) ? body.newsletterId : null;
    await connectDB();
    const subscriberIds = await NewsletterSend.distinct('subscriber', {
      ...mailboxGoneSendFilter(),
      ...(newsletterId ? { newsletter: new Types.ObjectId(newsletterId) } : {}),
    });
    const result = subscriberIds.length
      ? await Subscriber.updateMany(
          { _id: { $in: subscriberIds }, status: 'confirmed' },
          { $set: { status: 'unsubscribed', unsubscribedAt: new Date() }, $addToSet: { tags: 'bounced' } },
        )
      : { modifiedCount: 0 };
    return NextResponse.json({ unsubscribed: result.modifiedCount });
  } catch (error) {
    if (error instanceof AdminAccessError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    console.error('Bounce clean-up failed', error);
    return NextResponse.json({ error: 'Bounce clean-up failed' }, { status: 500 });
  }
}
