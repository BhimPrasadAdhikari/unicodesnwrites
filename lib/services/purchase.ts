import Stripe from 'stripe';
import dbConnect from '@/lib/db/connection';
import Purchase, { IPurchase } from '@/lib/models/Purchase';
import Product, { IProduct } from '@/lib/models/Product';
import { Analytics } from '@/lib/models/Analytics';
import { generateDownloadToken, getExpiryDate } from '@/lib/utils/download-token';
import { sendPurchaseConfirmation } from '@/lib/services/email';
import { createCheckoutSession } from '@/lib/services/stripe';
import { v4 as uuidv4 } from 'uuid';
import { hashPrivateIdentifier } from '@/lib/auth/security';

export class ProductPurchaseError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'ProductPurchaseError';
    this.statusCode = statusCode;
  }
}

export interface CheckoutForProductInput {
  productId: string;
  customerEmail?: string;
  appUrl?: string;
}

export interface CheckoutForProductResult {
  sessionId: string;
  url: string | null;
}

export interface DownloadRequestContext {
  ip?: string;
  userAgent?: string;
}

export interface AuthorizedProductDownload {
  purchase: IPurchase;
  product: IProduct;
}

export async function createCheckoutForProduct({
  productId,
  customerEmail,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
}: CheckoutForProductInput): Promise<CheckoutForProductResult> {
  await dbConnect();

  const product = await Product.findOne({ _id: productId, published: true });
  if (!product) {
    throw new ProductPurchaseError('Product not found', 404);
  }

  if (!product.stripePriceId) {
    throw new ProductPurchaseError('Product not configured for payments', 400);
  }

  const purchaseId = uuidv4();
  const session = await createCheckoutSession({
    priceId: product.stripePriceId,
    successUrl: `${appUrl}/products/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${appUrl}/products/${product.slug}?checkout=cancelled`,
    customerEmail,
    metadata: {
      productId: product._id.toString(),
      purchaseId,
    },
  });

  return {
    sessionId: session.id,
    url: session.url,
  };
}

export async function createPurchaseFromSession(session: Stripe.Checkout.Session) {
  return completeCheckoutSession(session);
}

export async function completeCheckoutSession(session: Stripe.Checkout.Session) {
  await dbConnect();
  const productId = session.metadata?.productId;
  const purchaseId = session.metadata?.purchaseId;

  if (!productId || !purchaseId) {
    throw new ProductPurchaseError('Missing metadata in Stripe session', 400);
  }

  // Check if purchase already exists (Idempotency)
  const existingPurchase = await Purchase.findOne({ stripeSessionId: session.id });
  if (existingPurchase) {
    return existingPurchase;
  }

  // Create Purchase Record
  const downloadToken = generateDownloadToken();
  const expiryDate = getExpiryDate(Number(process.env.DOWNLOAD_TOKEN_EXPIRY_HOURS) || 24);

  const purchase = await Purchase.create({
    purchaseId: purchaseId,
    product: productId,
    // Stored lowercased so /account (which matches on the signed-in email) finds it.
    customerEmail: (session.customer_details?.email || '').trim().toLowerCase(),
    customerName: session.customer_details?.name || '',
    amount: session.amount_total || 0,
    currency: session.currency || 'usd',
    stripeSessionId: session.id,
    stripePaymentIntentId: (session.payment_intent as string) || '',
    status: 'completed',
    downloadToken: downloadToken,
    downloadTokenExpiry: expiryDate,
    downloadCount: 0,
    metadata: (session.metadata || {}) as any,
  } as any);

  // Update Product Stats
  const product = await Product.findByIdAndUpdate(
    productId,
    {
      $inc: {
        totalSales: 1,
        totalRevenue: session.amount_total || 0,
      },
    },
    { new: true }
  );

  // Send Email (Async)
  if (product && purchase) {
    try {
      await sendPurchaseConfirmation(purchase, product);
      await Purchase.findByIdAndUpdate(purchase._id, {
        emailSent: true,
        emailSentAt: new Date(),
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't fail the purchase if email fails, just log it
    }
  }

  return purchase;
}

export async function markPurchaseRefundedByPaymentIntent(paymentIntentId: string) {
  await dbConnect();

  // Only a completed purchase moves to refunded, so a replayed webhook can't
  // subtract from the product totals twice.
  const purchase = await Purchase.findOneAndUpdate(
    { stripePaymentIntentId: paymentIntentId, status: 'completed' },
    {
      status: 'refunded',
      refundedAt: new Date(),
    },
    { new: true }
  );

  if (!purchase) {
    const existing = await Purchase.findOne({ stripePaymentIntentId: paymentIntentId });
    if (existing) return existing;
    throw new ProductPurchaseError('Purchase not found for refund', 404);
  }

  await Product.updateOne(
    { _id: purchase.product },
    { $inc: { totalSales: -1, totalRevenue: -(purchase.amount || 0) } }
  );

  return purchase;
}

export async function authorizeProductDownload(
  token: string,
): Promise<AuthorizedProductDownload> {
  if (!token) {
    throw new ProductPurchaseError('Missing token', 400);
  }

  await dbConnect();

  const purchase = await Purchase.findOne({ downloadToken: token }).populate({
    path: 'product',
    model: Product,
    select: '+fileUrl',
  });

  if (!purchase) {
    throw new ProductPurchaseError('Invalid token', 404);
  }

  if (purchase.status !== 'completed') {
    throw new ProductPurchaseError('Purchase not confirmed or refunded', 403);
  }

  if (new Date() > new Date(purchase.downloadTokenExpiry)) {
    throw new ProductPurchaseError('Download link expired. Please request a new one.', 410);
  }

  if (purchase.downloadCount >= purchase.maxDownloads) {
    throw new ProductPurchaseError('Download limit reached.', 403);
  }

  const product = purchase.product as unknown as IProduct;
  if (!product?.fileUrl) {
    throw new ProductPurchaseError('File not found or invalid storage path', 404);
  }

  return {
    purchase,
    product,
  };
}

export async function consumeAuthorizedProductDownload(
  purchase: IPurchase,
  product: IProduct,
  context: DownloadRequestContext = {}
) {
  const claimedPurchase = await Purchase.findOneAndUpdate(
    {
      _id: purchase._id,
      status: 'completed',
      downloadTokenExpiry: { $gt: new Date() },
      $expr: { $lt: ['$downloadCount', '$maxDownloads'] },
    },
    { $inc: { downloadCount: 1 } },
    { new: true }
  );

  if (!claimedPurchase) {
    throw new ProductPurchaseError('Download link expired or download limit reached.', 403);
  }

  await recordProductDownload(claimedPurchase, product, context);
  return claimedPurchase;
}

/**
 * A fresh download link for a completed purchase: new token, new expiry and the
 * download allowance restored. Callers must already have proved ownership.
 */
export async function reissueDownloadToken(purchaseId: string) {
  await dbConnect();
  const purchase = await Purchase.findOneAndUpdate(
    { _id: purchaseId, status: 'completed' },
    {
      downloadToken: generateDownloadToken(),
      downloadTokenExpiry: getExpiryDate(Number(process.env.DOWNLOAD_TOKEN_EXPIRY_HOURS) || 24),
      downloadCount: 0,
    },
    { new: true }
  );
  if (!purchase) {
    throw new ProductPurchaseError('Purchase not found', 404);
  }
  return purchase;
}

/** Emails a fresh link for every completed purchase made with this address. Returns how many were sent. */
export async function emailFreshDownloadLinks(email: string) {
  await dbConnect();
  const purchases = await Purchase.find({ customerEmail: email, status: 'completed' })
    .collation({ locale: 'en', strength: 2 })
    .sort({ purchasedAt: -1 })
    .limit(20)
    .select('_id product')
    .lean();

  let sent = 0;
  for (const item of purchases) {
    const product = await Product.findById(item.product);
    if (!product) continue;
    const purchase = await reissueDownloadToken(String(item._id));
    try {
      await sendPurchaseConfirmation(purchase, product);
      sent += 1;
    } catch (error) {
      console.error('Failed to email a fresh download link', error);
    }
  }
  return sent;
}

export async function resendPurchaseConfirmationEmail(purchaseId: string) {
  await dbConnect();

  const purchase = await Purchase.findById(purchaseId);
  if (!purchase) {
    throw new ProductPurchaseError('Purchase not found', 404);
  }

  const product = await Product.findById(purchase.product);
  if (!product) {
    throw new ProductPurchaseError('Associated product not found', 404);
  }

  const updatedPurchase = await Purchase.findByIdAndUpdate(
    purchase._id,
    {
      downloadToken: generateDownloadToken(),
      downloadTokenExpiry: getExpiryDate(24),
    },
    { new: true }
  );

  if (!updatedPurchase) {
    throw new ProductPurchaseError('Failed to update purchase', 500);
  }

  await sendPurchaseConfirmation(updatedPurchase, product);

  return updatedPurchase;
}

async function recordProductDownload(
  purchase: IPurchase,
  product: IProduct,
  context: DownloadRequestContext
) {
  try {
    const ipHash = context.ip ? hashPrivateIdentifier(context.ip) : undefined;

    await Analytics.create({
      event: 'product_download',
      productId: product._id,
      timestamp: new Date(),
      metadata: {
        purchaseId: purchase._id,
        title: product.title,
      },
      ipHash,
      userAgent: context.userAgent || 'unknown',
    });
  } catch (error) {
    console.error('Failed to track download', error);
  }
}
