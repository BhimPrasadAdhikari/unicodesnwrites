import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Subscriber from '@/lib/models/Subscriber';
import SuppressedEmail, { hashSuppressedEmail } from '@/lib/models/SuppressedEmail';
import { sendWelcomeEmail } from '@/lib/services/email';
import { Analytics } from '@/lib/models/Analytics';
import { BOUNCED_TAG } from '@/lib/utils/validations/subscriber';
import { addSourceTags, getWelcomeSeriesSettings, welcomeSeriesStartFields } from '@/lib/services/welcome-series';
import type { Types } from 'mongoose';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token || !/^[a-f\d]{64}$/i.test(token)) {
    return NextResponse.json(
      { error: 'A valid confirmation token is required' },
      { status: 400 }
    );
  }

  try {
    await dbConnect();

    // Only the token's hash is stored, so look the subscriber up by hashing the link's token.
    const crypto = await import('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const subscriber = await Subscriber.findOne({ confirmationToken: hashedToken });

    if (!subscriber) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 400 }
      );
    }

    // The used token is kept (its expiry is cleared), so a second click on the same link lands
    // here instead of failing.
    if (subscriber.status === 'confirmed') {
       return NextResponse.json(
        { message: 'You are already subscribed. New issues will arrive in your inbox.', source: subscriber.source },
        { status: 200 }
      );
    }

    if (!subscriber.isTokenValid(token)) {
       return NextResponse.json(
        { error: 'Token expired' },
        { status: 400 }
      );
    }

    // The welcome series is opt-in for the site: it only starts for readers confirming while it is on.
    const welcomeSeries = await getWelcomeSeriesSettings().catch((settingsError) => {
      console.error('Failed to load welcome series settings', settingsError);
      return null;
    });
    const confirmedAt = new Date();

    // Conditional update: two clicks at once confirm (and send the welcome email) only once.
    const confirmed = await Subscriber.findOneAndUpdate(
      { _id: subscriber._id, status: 'pending', confirmationToken: hashedToken },
      // Opening the link proves the mailbox works again, so an old "bounced" tag no longer keeps them off campaigns.
      {
        $set: { status: 'confirmed', confirmedAt, ...welcomeSeriesStartFields(welcomeSeries, subscriber, confirmedAt) },
        $unset: { confirmationTokenExpiry: 1 },
        $pull: { tags: BOUNCED_TAG },
      },
      { new: true },
    );
    if (!confirmed) {
      return NextResponse.json({ message: 'You are already subscribed. New issues will arrive in your inbox.', source: subscriber.source }, { status: 200 });
    }

    // They opted back in themselves, so an earlier admin deletion no longer blocks imports.
    try {
      await SuppressedEmail.deleteOne({ emailHash: hashSuppressedEmail(subscriber.email) });
    } catch (suppressionError) {
      console.error('Failed to clear email suppression', suppressionError);
    }

    // A separate write: the confirmation above already $pulls from tags.
    if (welcomeSeries?.enabled) {
      try {
        await addSourceTags(confirmed._id as Types.ObjectId, confirmed.source);
      } catch (tagError) {
        console.error('Failed to add source tags', tagError);
      }
    }

    try {
      await Analytics.create({
        event: 'newsletter_signup_confirmed',
        timestamp: new Date(),
        page: '/newsletter/confirm',
        subscriberId: subscriber._id,
        metadata: {
          source: subscriber.source,
          email: subscriber.email,
        },
      });
    } catch (analyticsError) {
      console.error('Failed to log confirmation analytics event', analyticsError);
    }

    // Send welcome email (step 0 of the welcome series; the scheduler sends the rest)
    try {
        await sendWelcomeEmail(subscriber);
    } catch (emailError) {
        console.error("Failed to send welcome email", emailError);
        // Don't fail the request if email fails, as they are already confirmed
    }

    return NextResponse.json(
      { message: 'Subscription confirmed successfully', source: subscriber.source },
      { status: 200 }
    );

  } catch (error) {
    console.error('Confirmation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
