import dbConnect from '@/lib/db/connection';
import Purchase, { IPurchase } from '@/lib/models/Purchase';
import Product, { IProduct } from '@/lib/models/Product';
import { Analytics } from '@/lib/models/Analytics';
import { generateDownloadToken, getExpiryDate } from '@/lib/utils/download-token';
import { sendPurchaseConfirmation } from '@/lib/services/email';
import {
  captureRazorpayPayment,
  createRazorpayOrder,
  fetchRazorpayOrderPayments,
  fetchRazorpayPayment,
  getRazorpayKeyId,
  RazorpayPayment,
  verifyPaymentSignature,
} from '@/lib/services/razorpay';
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
}

export interface CheckoutForProductResult {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  productTitle: string;
  prefillEmail?: string;
}

export interface VerifyCheckoutInput {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface DownloadRequestContext {
  ip?: string;
  userAgent?: string;
}

export interface AuthorizedProductDownload {
  purchase: IPurchase;
  product: IProduct;
}

// Razorpay rejects orders below ₹1.
const MIN_ORDER_PAISE = 100;

export async function createCheckoutForProduct({
  productId,
  customerEmail,
}: CheckoutForProductInput): Promise<CheckoutForProductResult> {
  await dbConnect();

  const product = await Product.findOne({ _id: productId, published: true });
  if (!product) {
    throw new ProductPurchaseError('Product not found', 404);
  }

  if (product.currency !== 'INR' || product.price < MIN_ORDER_PAISE) {
    throw new ProductPurchaseError('Product not configured for payments', 400);
  }

  const purchaseId = uuidv4();
  const order = await createRazorpayOrder({
    amount: product.price,
    currency: 'INR',
    receipt: purchaseId,
    notes: {
      productId: product._id.toString(),
      purchaseId,
    },
  });

  await Purchase.create({
    purchaseId,
    product: product._id,
    customerEmail: customerEmail || '',
    amount: order.amount,
    currency: order.currency,
    razorpayOrderId: order.id,
    status: 'pending',
  });

  return {
    keyId: getRazorpayKeyId(),
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    productTitle: product.title,
    prefillEmail: customerEmail,
  };
}

/** Called by the checkout handler: trust the payment only after the signature and API agree. */
export async function verifyCheckoutPayment({ orderId, paymentId, signature }: VerifyCheckoutInput) {
  if (!verifyPaymentSignature(orderId, paymentId, signature)) {
    throw new ProductPurchaseError('Payment signature mismatch', 400);
  }

  const payment = await fetchRazorpayPayment(paymentId);
  if (payment.order_id !== orderId) {
    throw new ProductPurchaseError('Payment does not belong to this order', 400);
  }

  return completeRazorpayPayment(payment);
}

/**
 * Marks the order's purchase paid and delivers the download. Safe to call from
 * the checkout handler, the webhook and the success-page fallback at once.
 */
export async function completeRazorpayPayment(payment: RazorpayPayment) {
  await dbConnect();

  if (!payment.order_id) {
    throw new ProductPurchaseError('Payment has no order', 400);
  }

  const purchase = await Purchase.findOne({ razorpayOrderId: payment.order_id });
  if (!purchase) {
    throw new ProductPurchaseError('Purchase not found for order', 404);
  }

  if (purchase.status === 'completed' || purchase.status === 'refunded') {
    return purchase;
  }

  if (payment.amount !== purchase.amount || payment.currency !== purchase.currency) {
    throw new ProductPurchaseError('Payment amount does not match the order', 400);
  }

  let settled = payment;
  if (settled.status === 'authorized') {
    settled = await captureRazorpayPayment(payment.id, payment.amount, payment.currency);
  }
  if (settled.status !== 'captured') {
    throw new ProductPurchaseError(`Payment is ${settled.status}, not captured`, 409);
  }

  const expiryDate = getExpiryDate(Number(process.env.DOWNLOAD_TOKEN_EXPIRY_HOURS) || 24);
  const completed = await Purchase.findOneAndUpdate(
    { _id: purchase._id, status: { $in: ['pending', 'failed'] } },
    {
      $set: {
        status: 'completed',
        razorpayPaymentId: settled.id,
        // Stored lowercased so /account (which matches on the signed-in email) finds it.
        customerEmail: (settled.email || purchase.customerEmail || '').trim().toLowerCase(),
        paymentMethod: settled.method,
        downloadToken: generateDownloadToken(),
        downloadTokenExpiry: expiryDate,
        downloadCount: 0,
        purchasedAt: new Date(),
      },
      $unset: { failureReason: '' },
    },
    { new: true }
  );

  // Another caller completed it first.
  if (!completed) {
    return (await Purchase.findById(purchase._id)) ?? purchase;
  }

  const product = await Product.findByIdAndUpdate(
    completed.product,
    { $inc: { totalSales: 1, totalRevenue: completed.amount } },
    { new: true }
  );

  if (product && completed.customerEmail) {
    try {
      await sendPurchaseConfirmation(completed, product);
      await Purchase.findByIdAndUpdate(completed._id, {
        emailSent: true,
        emailSentAt: new Date(),
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't fail the purchase if email fails, just log it
    }
  }

  return completed;
}

/** Success-page fallback when neither the handler nor the webhook has landed yet. */
export async function reconcileRazorpayOrder(orderId: string) {
  const { items } = await fetchRazorpayOrderPayments(orderId);
  const paid = items.find((payment) => payment.status === 'captured' || payment.status === 'authorized');
  return paid ? completeRazorpayPayment(paid) : null;
}

export async function markRazorpayPaymentFailed(payment: RazorpayPayment) {
  if (!payment.order_id) return null;
  await dbConnect();

  return Purchase.findOneAndUpdate(
    { razorpayOrderId: payment.order_id, status: 'pending' },
    { status: 'failed', failureReason: payment.error_description || payment.error_code || 'Payment failed' },
    { new: true }
  );
}

export async function markPurchaseRefundedByPayment(paymentId: string) {
  await dbConnect();

  // Only a completed purchase moves to refunded, so a replayed webhook can't
  // subtract from the product totals twice.
  const purchase = await Purchase.findOneAndUpdate(
    { razorpayPaymentId: paymentId, status: 'completed' },
    {
      status: 'refunded',
      refundedAt: new Date(),
    },
    { new: true }
  );

  if (!purchase) {
    const existing = await Purchase.findOne({ razorpayPaymentId: paymentId });
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
