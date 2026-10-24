import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Subscriber from '@/lib/models/Subscriber';
import { sendWelcomeEmail } from '@/lib/services/email';
import { Analytics } from '@/lib/models/Analytics';

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

    // Note: We need to hash the token to find it because we store the hash
    // BUT our model method isTokenValid takes the raw token and hashes it for comparison.
    // However, to FIND the user, we can't use the raw token if we only stored the hash.
    // Wait, the model schema says: confirmationToken: string. 
    // And generateConfirmationToken stores the HASH. 
    // So we need to query by... waiting.
    
    // Efficient way: We don't query by token because multiple users could theoretically have same hash collision (unlikely) 
    // or we just query by the hashed token.
    // Let's check the model:
    /*
    this.confirmationToken = crypto.createHash('sha256').update(token).digest('hex');
    */
    // So distinct subscribers will have distinct tokens.
    // We should hash the incoming token and search for that.
    
    const crypto = await import('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const subscriber = await Subscriber.findOne({ confirmationToken: hashedToken });

    if (!subscriber) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 400 }
      );
    }

    if (subscriber.status === 'confirmed') {
       return NextResponse.json(
        { message: 'Already confirmed' },
        { status: 200 }
      );
    }

    if (!subscriber.isTokenValid(token)) {
       return NextResponse.json(
        { error: 'Token expired' },
        { status: 400 }
      );
    }

    subscriber.status = 'confirmed';
    subscriber.confirmedAt = new Date();
    subscriber.confirmationToken = undefined; // Clear token after use
    subscriber.confirmationTokenExpiry = undefined;
    await subscriber.save();

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

    // Send welcome email
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
