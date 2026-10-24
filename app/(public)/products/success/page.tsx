import type { Metadata } from 'next';
import Link from 'next/link';
import { Download } from 'lucide-react';
import OrderProcessing from './OrderProcessing';
import {connectDB} from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import Purchase from '@/lib/models/Purchase';
import { formatCurrency } from '@/lib/utils/currency';
import { Section, Container } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import AnalyticsTracker from '@/components/analytics/AnalyticsTracker';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { robots: { index: false, follow: false } };

const isValidStripeSessionId = (value: string) => /^cs_(?:test|live)_[A-Za-z0-9]+$/.test(value) && value.length <= 255;

async function getPurchase(sessionId: string) {
  if (!isValidStripeSessionId(sessionId)) return null;
  await connectDB();
  // Ensure Product model is registered for populate
  if (Product) {} 
  const purchase = await Purchase.findOne({ stripeSessionId: sessionId }).populate('product');
  if (!purchase) return null;
  return JSON.parse(JSON.stringify(purchase));
}

export default async function SuccessPage(props: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const searchParams = await props.searchParams;
  const sessionId = searchParams.session_id;

  if (!sessionId || !isValidStripeSessionId(sessionId)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
           <p className="mb-4 text-destructive">This checkout session is invalid or incomplete.</p>
           <Link href="/products" className="font-medium underline decoration-primary decoration-2 underline-offset-4">Return to tools</Link>
        </div>
      </div>
    );
  }

  let purchase = await getPurchase(sessionId);

  if (!purchase) {
    // FALLBACK: If purchase not found in DB, check Stripe directly
    // This handles cases where webhook is failed or delayed
    try {
      const { stripe } = await import('@/lib/services/stripe');
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status === 'paid') {
        const { createPurchaseFromSession } = await import('@/lib/services/purchase');
        await createPurchaseFromSession(session);
        // Re-fetch to ensure product is populated
        purchase = await getPurchase(sessionId);
      }
    } catch (error) {
       console.error('Error fetching/creating purchase from Stripe:', error);
    }
  }

  if (!purchase) {
     return <OrderProcessing />;
  }

  const product = purchase.product;

  return (
    <div className="min-h-screen">
      <AnalyticsTracker
        event="purchase_success"
        metadata={{
          productId: product._id,
          purchaseId: purchase.purchaseId,
          amount: purchase.amount,
          currency: purchase.currency,
        }}
      />
      <Section className="pb-24 pt-12 md:pt-16">
        <Container>
          <div className="mx-auto max-w-2xl">
            <p className="font-mono text-[12px] tracking-[0.08em] text-success">PAID · RECEIPT</p>
            <h1 className="mt-3 text-title text-foreground">Your tool is ready.</h1>
            <p className="mt-4 font-serif text-[19px] leading-[1.55] text-muted-foreground sm:text-[21px]">
              Your purchase of <span className="text-foreground">{product.title}</span> went through.
            </p>

            <dl className="mt-8 divide-y divide-border rounded-xl border border-border bg-card px-5 sm:px-6">
              <div className="flex items-center justify-between gap-4 py-4">
                <dt className="text-eyebrow text-muted-foreground">Order</dt>
                <dd className="truncate font-mono text-sm text-foreground">{purchase.purchaseId}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <dt className="text-eyebrow text-muted-foreground">Date</dt>
                <dd className="text-sm text-foreground">{new Date(purchase.purchasedAt).toLocaleDateString()}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <dt className="text-eyebrow text-muted-foreground">Total</dt>
                <dd className="font-mono text-base text-foreground">{formatCurrency(purchase.amount, purchase.currency)}</dd>
              </div>
            </dl>

            <p className="mt-5 text-sm text-muted-foreground">
              A confirmation went to <span className="font-medium text-foreground">{purchase.customerEmail}</span>.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <a href={`/api/download?token=${encodeURIComponent(purchase.downloadToken)}`}>
                  <Download className="mr-2 h-5 w-5" />
                  Download files
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/products">Browse more tools</Link>
              </Button>
            </div>
            <p className="pen-note mt-6 text-base">the link expires in 24 hours; ask for a new one any time</p>
          </div>
        </Container>
      </Section>
    </div>
  );
}
