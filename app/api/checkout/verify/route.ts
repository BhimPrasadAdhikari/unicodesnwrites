import { NextRequest, NextResponse } from 'next/server';
import { ProductPurchaseError, verifyCheckoutPayment } from '@/lib/services/purchase';
import { RazorpayApiError, RazorpayConfigError } from '@/lib/services/razorpay';
import { checkoutVerifySchema } from '@/lib/utils/validation';
import { consumeRateLimit, getClientAddress } from '@/lib/auth/security';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const validationResult = checkoutVerifySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid payment response' }, { status: 400 });
    }

    const ipLimit = await consumeRateLimit({
      scope: 'checkout-verify-ip',
      identifier: getClientAddress(req),
      limit: 30,
      windowSeconds: 15 * 60,
    });
    if (!ipLimit.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = validationResult.data;
    const purchase = await verifyCheckoutPayment({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    return NextResponse.json({ orderId: purchase.razorpayOrderId, status: purchase.status });
  } catch (error) {
    if (error instanceof ProductPurchaseError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof RazorpayConfigError || error instanceof RazorpayApiError) {
      console.error('Razorpay verify error:', error.message);
      return NextResponse.json({ error: 'We could not confirm the payment yet. Your order page will update shortly.' }, { status: 502 });
    }

    console.error('Checkout verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
