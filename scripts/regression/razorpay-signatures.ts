// Checks Razorpay signature verification (checkout handler and webhook), id guards,
// INR formatting and product price validation. Uses throwaway secrets, no network.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.RAZORPAY_KEY_ID = 'rzp_test_regression';
process.env.RAZORPAY_KEY_SECRET = 'regression-key-secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'regression-webhook-secret';

const sign = (secret: string, payload: string) => crypto.createHmac('sha256', secret).update(payload).digest('hex');

async function main() {
  const { verifyPaymentSignature, verifyWebhookSignature, isRazorpayOrderId, isRazorpayPaymentId } = await import('../../lib/services/razorpay');
  const { formatCurrency } = await import('../../lib/utils/currency');
  const { productSchema, checkoutVerifySchema } = await import('../../lib/utils/validation');

  const orderId = 'order_RegressionAbc123';
  const paymentId = 'pay_RegressionXyz789';

  // Order checkout: HMAC(order_id|payment_id, key secret).
  const good = sign('regression-key-secret', `${orderId}|${paymentId}`);
  assert.equal(verifyPaymentSignature(orderId, paymentId, good), true);
  // Swapped order (the subscription format) must not pass for orders.
  assert.equal(verifyPaymentSignature(orderId, paymentId, sign('regression-key-secret', `${paymentId}|${orderId}`)), false);
  // Signed with the webhook secret instead of the key secret.
  assert.equal(verifyPaymentSignature(orderId, paymentId, sign('regression-webhook-secret', `${orderId}|${paymentId}`)), false);
  assert.equal(verifyPaymentSignature(orderId, paymentId, 'not-hex'), false);
  assert.equal(verifyPaymentSignature(orderId, paymentId, ''), false);

  // Webhook: HMAC(raw body, webhook secret); any byte change fails.
  const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: paymentId } } } });
  assert.equal(verifyWebhookSignature(body, sign('regression-webhook-secret', body)), true);
  assert.equal(verifyWebhookSignature(`${body} `, sign('regression-webhook-secret', body)), false);
  assert.equal(verifyWebhookSignature(body, sign('regression-key-secret', body)), false);

  assert.equal(isRazorpayOrderId(orderId), true);
  assert.equal(isRazorpayOrderId('cs_test_abc'), false);
  assert.equal(isRazorpayOrderId('order_<script>'), false);
  assert.equal(isRazorpayPaymentId(paymentId), true);
  assert.equal(isRazorpayPaymentId(orderId), false);

  assert.equal(checkoutVerifySchema.safeParse({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: good }).success, true);
  assert.equal(checkoutVerifySchema.safeParse({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: 'x' }).success, false);

  assert.equal(formatCurrency(49900), '₹499');
  assert.equal(formatCurrency(14999950), '₹1,49,999.50');
  assert.equal(formatCurrency(0), '₹0');

  const baseProduct = {
    title: 'Regression product', slug: 'regression-product', shortDescription: 'A product used by tests only.',
    longDescription: 'Long description for the regression product.', productType: 'Template', category: 'Testing',
    tags: [], thumbnailImage: '', fileUrl: '', fileName: 'x.zip', fileSize: 1, fileSizeDisplay: '1 B', licenseType: 'Personal',
  };
  const parse = (extra: Record<string, unknown>) => productSchema.safeParse({ ...baseProduct, ...extra });
  assert.equal(parse({ price: 49900 }).success, true);
  assert.equal(parse({ price: 49900 }).data?.currency, 'INR');
  assert.equal(parse({ price: 0 }).success, true, 'free products stay allowed');
  assert.equal(parse({ price: 50 }).success, false, 'below ₹1 is rejected');
  assert.equal(parse({ price: 499.5 }).success, false, 'fractional paise rejected');
  assert.equal(parse({ price: 49900, currency: 'USD' }).data?.currency, 'INR', 'legacy currency is coerced to INR');

  console.log('razorpay regression: all checks passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
