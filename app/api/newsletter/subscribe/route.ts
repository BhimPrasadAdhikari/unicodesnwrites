import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/db/connection';
import Subscriber from '@/lib/models/Subscriber';
import { subscribeSchema } from '@/lib/utils/validations/newsletter';
import { sendSubscriberConfirmation } from '@/lib/services/email';
import { trackNewsletterSignup } from '@/lib/services/event-tracking';
import { consumeRateLimit, getClientAddress, normalizeEmail } from '@/lib/auth/security';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = subscribeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { email, name, source } = result.data;

    const [ipLimit, emailLimit] = await Promise.all([
      consumeRateLimit({ scope: 'newsletter-subscribe-ip', identifier: getClientAddress(req), limit: 12, windowSeconds: 60 * 60 }),
      consumeRateLimit({ scope: 'newsletter-subscribe-email', identifier: normalizeEmail(email), limit: 3, windowSeconds: 60 * 60 }),
    ]);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      return NextResponse.json({ error: 'Too many subscription attempts. Please try again later.' }, { status: 429 });
    }

    await dbConnect();

    // Every outcome gets the same reply, so the form can't be used to check who is subscribed.
    const reply = () =>
      NextResponse.json({ message: 'Thanks! Check your inbox for a link to confirm your subscription.' }, { status: 200 });

    const existingSubscriber = await Subscriber.findOne({ email });

    if (existingSubscriber?.status === 'confirmed') {
      return reply(); // already on the list: nothing to send
    }

    if (existingSubscriber) {
      // Pending: send the link again. Unsubscribed: resubscribing goes through double opt-in
      // again, so a third party can't silently re-add someone who left.
      if (existingSubscriber.status === 'unsubscribed') {
        existingSubscriber.status = 'pending';
        existingSubscriber.source = source || existingSubscriber.source;
        existingSubscriber.unsubscribedAt = undefined;
      }
      const token = existingSubscriber.generateConfirmationToken();
      await existingSubscriber.save();
      await sendSubscriberConfirmation(existingSubscriber, token);
      return reply();
    }

    const newSubscriber = new Subscriber({
      email,
      name,
      source,
      status: 'pending',
    });

    const token = newSubscriber.generateConfirmationToken();
    await newSubscriber.save();

    await sendSubscriberConfirmation(newSubscriber, token);

    // Track server-side event
    await trackNewsletterSignup(email);

    return reply();

  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    console.error('Subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
