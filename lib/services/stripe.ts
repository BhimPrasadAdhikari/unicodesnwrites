import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is missing');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-01-28.clover',
  typescript: true,
});

export const createStripeProduct = async (productData: {
  title: string;
  description: string;
  images: string[];
  metadata?: Record<string, string>;
}) => {
  return stripe.products.create({
    name: productData.title,
    description: productData.description,
    images: productData.images,
    metadata: productData.metadata,
  });
};

export const createStripePrice = async (
  amountInCents: number,
  currency: string = 'usd',
  productId: string
) => {
  return stripe.prices.create({
    product: productId,
    unit_amount: amountInCents,
    currency: currency,
  });
};

export const archiveStripePrice = async (priceId: string) => {
  return stripe.prices.update(priceId, {
    active: false,
  });
};

export const archiveStripeProduct = async (productId: string) => {
  return stripe.products.update(productId, {
    active: false,
  });
};

export const createCheckoutSession = async ({
  priceId,
  successUrl,
  cancelUrl,
  customerEmail,
  metadata,
}: {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}) => {
  return stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: customerEmail,
    metadata: metadata,
  });
};

export const verifyWebhookSignature = (
  payload: string | Buffer,
  signature: string,
  secret: string
) => {
  return stripe.webhooks.constructEvent(payload, signature, secret);
};
