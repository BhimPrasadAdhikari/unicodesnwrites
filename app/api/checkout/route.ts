import { NextRequest, NextResponse } from 'next/server';
import {
  createCheckoutForProduct,
  ProductPurchaseError,
} from '@/lib/services/purchase';
import { checkoutSchema } from '@/lib/utils/validation';
import { consumeRateLimit, getClientAddress, normalizeEmail } from '@/lib/auth/security';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const validationResult = checkoutSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const clientAddress = getClientAddress(req);
    const email = validationResult.data.email ? normalizeEmail(validationResult.data.email) : null;
    const [ipLimit, emailLimit] = await Promise.all([
      consumeRateLimit({ scope: 'checkout-ip', identifier: clientAddress, limit: 12, windowSeconds: 15 * 60 }),
      email ? consumeRateLimit({ scope: 'checkout-email', identifier: email, limit: 6, windowSeconds: 15 * 60 }) : Promise.resolve({ allowed: true }),
    ]);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      return NextResponse.json({ error: 'Too many checkout attempts. Please try again later.' }, { status: 429 });
    }

    const session = await createCheckoutForProduct({
      productId: validationResult.data.productId,
      customerEmail: email || undefined,
    });

    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof ProductPurchaseError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
