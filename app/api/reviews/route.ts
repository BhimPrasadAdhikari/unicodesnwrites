import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Review from '@/lib/models/Review';
import Purchase from '@/lib/models/Purchase';
import { reviewSchema } from '@/lib/utils/validation';
import { consumeRateLimit, getClientAddress, normalizeEmail } from '@/lib/auth/security';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/config/auth';
import { isObjectId } from '@/lib/utils/object-id';

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

    // "Verified purchase" needs proof of who is writing: a signed-in account whose
    // email bought the product. A typed-in email alone proves nothing.
    const session = await getServerSession(authOptions);
    const sessionEmail = session?.user?.sessionValid && session.user.email ? normalizeEmail(session.user.email) : null;
    const purchase = sessionEmail
      ? await Purchase.findOne({ customerEmail: sessionEmail, product: productId, status: 'completed' }).select('_id').lean()
      : null;

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

    if (!productId || !isObjectId(productId)) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    await dbConnect();

    const reviews = await Review.find({
      product: productId,
      approved: true,
    })
      .select('customerName rating comment verified createdAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json(reviews);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
