import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import WebhookEvent from '@/lib/models/WebhookEvent';
import {
  completeRazorpayPayment,
  markPurchaseRefundedByPayment,
  markRazorpayPaymentFailed,
  ProductPurchaseError,
} from '@/lib/services/purchase';
import { RazorpayPayment, RazorpayRefund, verifyWebhookSignature } from '@/lib/services/razorpay';

interface RazorpayWebhookBody {
  event: string;
  payload: {
    payment?: { entity: RazorpayPayment };
    refund?: { entity: RazorpayRefund };
  };
}

async function applyEvent({ event, payload }: RazorpayWebhookBody) {
  const payment = payload.payment?.entity;

  switch (event) {
    case 'payment.authorized':
    case 'payment.captured':
    case 'order.paid':
      if (payment) await completeRazorpayPayment(payment);
      return;
    case 'payment.failed':
      if (payment) await markRazorpayPaymentFailed(payment);
      return;
    case 'refund.processed': {
      const refund = payload.refund?.entity;
      const fullyRefunded = payment ? (payment.amount_refunded ?? 0) >= payment.amount : true;
      if (refund && fullyRefunded) await markPurchaseRefundedByPayment(refund.payment_id);
      else if (refund) console.warn(`Partial refund ${refund.id} on ${refund.payment_id}; purchase left active`);
      return;
    }
    case 'refund.failed':
      console.error(`Razorpay refund failed: ${payload.refund?.entity.id}`);
      return;
    default:
      if (event.startsWith('payment.dispute.')) {
        console.warn(`Razorpay dispute event ${event} for payment ${payment?.id ?? 'unknown'}`);
      }
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') || '';

  let valid = false;
  try {
    valid = Boolean(signature) && verifyWebhookSignature(rawBody, signature);
  } catch (error) {
    console.error('Razorpay webhook misconfigured:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let body: RazorpayWebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const eventId = req.headers.get('x-razorpay-event-id');

  try {
    await dbConnect();
    if (eventId && (await WebhookEvent.exists({ provider: 'razorpay', eventId }))) {
      return NextResponse.json({ status: 'duplicate' });
    }

    try {
      await applyEvent(body);
    } catch (error) {
      if (!(error instanceof ProductPurchaseError)) throw error;
      // The Razorpay account is shared with other Lagnever products, so orders this
      // site never created (404) are ignored. Other rejections won't improve on retry.
      if (error.statusCode !== 404) console.error(`Razorpay webhook ${body.event} rejected: ${error.message}`);
    }

    // Recorded only after the changes above committed, so a failed delivery is retried.
    if (eventId) {
      await WebhookEvent.create({ provider: 'razorpay', eventId, event: body.event }).catch((error) => {
        if (error?.code !== 11000) throw error;
      });
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error(`Razorpay webhook ${body.event} failed:`, error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
