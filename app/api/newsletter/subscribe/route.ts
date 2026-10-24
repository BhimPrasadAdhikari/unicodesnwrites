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

    // Check if subscriber exists
    const existingSubscriber = await Subscriber.findOne({ email });

    if (existingSubscriber) {
      if (existingSubscriber.status === 'confirmed') {
        return NextResponse.json(
          { message: "You're already subscribed!" },
          { status: 200 }
        );
      } else if (existingSubscriber.status === 'unsubscribed') {
        // Resubscribing goes through double opt-in again, so a third party
        // can't silently re-add someone who left.
        existingSubscriber.status = 'pending';
        existingSubscriber.source = source || existingSubscriber.source;
        existingSubscriber.unsubscribedAt = undefined;
        const token = existingSubscriber.generateConfirmationToken();
        await existingSubscriber.save();
        await sendSubscriberConfirmation(existingSubscriber, token);
        return NextResponse.json(
          { message: 'Welcome back! Please check your email to confirm your subscription.' },
          { status: 200 }
        );
      } else if (existingSubscriber.status === 'pending') {
        // Resend confirmation
        const token = existingSubscriber.generateConfirmationToken();
        await existingSubscriber.save();
        await sendSubscriberConfirmation(existingSubscriber, token);
        return NextResponse.json(
          { message: "Confirmation email sent again. Please check your inbox." },
          { status: 200 }
        );
      }
    }

    // New subscriber
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

    return NextResponse.json(
      { message: "Thanks for signing up! Please check your email to confirm." },
      { status: 201 }
    );

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
