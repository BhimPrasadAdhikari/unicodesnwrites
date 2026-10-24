import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyWebhookSignature } from '@/lib/services/stripe';
import {
  completeCheckoutSession,
  markPurchaseRefundedByPaymentIntent,
  ProductPurchaseError,
} from '@/lib/services/purchase';
import Stripe from 'stripe';



export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature') as string;

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Stripe webhook secret missing' },
        { status: 500 }
      );
    }

    let event: Stripe.Event;

    try {
      event = verifyWebhookSignature(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      try {
        await completeCheckoutSession(session);
      } catch (err: any) {
        console.error('Error creating purchase from webhook:', err);
         return NextResponse.json(
          { error: `Purchase creation failed: ${err.message}` },
          { status: 500 }
        );
      }
    } else if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = charge.payment_intent as string;

      if (paymentIntentId) {
        try {
          await markPurchaseRefundedByPaymentIntent(paymentIntentId);
          console.log(`Purchase refunded for PaymentIntent: ${paymentIntentId}`);
        } catch (err) {
          if (err instanceof ProductPurchaseError && err.statusCode === 404) {
            console.warn(`No purchase found for refunded PaymentIntent: ${paymentIntentId}`);
          } else {
            throw err;
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
