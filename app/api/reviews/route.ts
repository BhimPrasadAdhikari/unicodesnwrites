import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Review from '@/lib/models/Review';
import Purchase from '@/lib/models/Purchase';
import { reviewSchema } from '@/lib/utils/validation';
import { consumeRateLimit, getClientAddress, normalizeEmail } from '@/lib/auth/security';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validationResult = reviewSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { productId, rating, comment, name, email } = validationResult.data;

    const [ipLimit, emailLimit] = await Promise.all([
      consumeRateLimit({ scope: 'review-ip', identifier: getClientAddress(req), limit: 10, windowSeconds: 24 * 60 * 60 }),
      consumeRateLimit({ scope: 'review-email', identifier: normalizeEmail(email), limit: 3, windowSeconds: 24 * 60 * 60 }),
    ]);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      return NextResponse.json({ error: 'Too many review submissions. Please try again later.' }, { status: 429 });
    }

    await dbConnect();

    // Check if verified purchase
    const purchase = await Purchase.findOne({
      customerEmail: email,
      product: productId,
      status: 'completed',
    });

    const isVerified = !!purchase;

    const review = await Review.create({
      product: productId,
      customerEmail: email,
      customerName: name,
      rating,
      comment,
      verified: isVerified,
      approved: false, // Default to unapproved
    });

    return NextResponse.json({ message: 'Review submitted for approval' }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    console.error('Review submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    await dbConnect();

    const reviews = await Review.find({
      product: productId,
      approved: true,
    }).sort({ createdAt: -1 });

    return NextResponse.json(reviews);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
