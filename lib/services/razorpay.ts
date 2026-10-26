import crypto from 'node:crypto';

const RAZORPAY_API = 'https://api.razorpay.com/v1';

export class RazorpayConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RazorpayConfigError';
  }
}

export class RazorpayApiError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.name = 'RazorpayApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export interface RazorpayOrder {
  id: string;
  entity: 'order';
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string | null;
  status: 'created' | 'attempted' | 'paid';
  notes: Record<string, string> | [];
  created_at: number;
}

export interface RazorpayPayment {
  id: string;
  entity: 'payment';
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  order_id: string | null;
  method?: string;
  email?: string;
  contact?: string;
  amount_refunded?: number;
  refund_status?: 'partial' | 'full' | null;
  captured?: boolean;
  error_code?: string | null;
  error_description?: string | null;
  notes: Record<string, string> | [];
  created_at: number;
}

export interface RazorpayRefund {
  id: string;
  entity: 'refund';
  amount: number;
  currency: string;
  payment_id: string;
  status: 'pending' | 'processed' | 'failed';
}

export const getRazorpayKeyId = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) throw new RazorpayConfigError('RAZORPAY_KEY_ID is missing');
  return keyId;
};

const getKeySecret = () => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new RazorpayConfigError('RAZORPAY_KEY_SECRET is missing');
  return secret;
};

const getWebhookSecret = () => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new RazorpayConfigError('RAZORPAY_WEBHOOK_SECRET is missing');
  return secret;
};

async function razorpayRequest<T>(path: string, init: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<T> {
  const auth = Buffer.from(`${getRazorpayKeyId()}:${getKeySecret()}`).toString('base64');
  const res = await fetch(`${RAZORPAY_API}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = (data as { error?: { description?: string; code?: string } }).error;
    throw new RazorpayApiError(error?.description || `Razorpay request failed (${res.status})`, res.status, error?.code);
  }
  return data as T;
}

export const createRazorpayOrder = ({
  amount,
  currency = 'INR',
  receipt,
  notes,
}: {
  amount: number; // in paise
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}) =>
  razorpayRequest<RazorpayOrder>('/orders', {
    method: 'POST',
    body: { amount, currency, receipt: receipt.slice(0, 40), notes },
  });

export const fetchRazorpayPayment = (paymentId: string) =>
  razorpayRequest<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`);

export const fetchRazorpayOrderPayments = (orderId: string) =>
  razorpayRequest<{ items: RazorpayPayment[] }>(`/orders/${encodeURIComponent(orderId)}/payments`);

export const captureRazorpayPayment = (paymentId: string, amount: number, currency: string) =>
  razorpayRequest<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}/capture`, {
    method: 'POST',
    body: { amount, currency },
  });

const hmacHex = (secret: string, payload: string | Buffer) =>
  crypto.createHmac('sha256', secret).update(payload).digest('hex');

const safeEqual = (expected: string, received: string) => {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/** Checkout handler signature: HMAC-SHA256(order_id + "|" + payment_id, key secret). */
export const verifyPaymentSignature = (orderId: string, paymentId: string, signature: string) =>
  safeEqual(hmacHex(getKeySecret(), `${orderId}|${paymentId}`), signature);

/** Webhook signature: HMAC-SHA256(raw body, webhook secret). */
export const verifyWebhookSignature = (rawBody: string, signature: string) =>
  safeEqual(hmacHex(getWebhookSecret(), rawBody), signature);

export const isRazorpayOrderId = (value: unknown): value is string =>
  typeof value === 'string' && /^order_[A-Za-z0-9]{8,40}$/.test(value);

export const isRazorpayPaymentId = (value: unknown): value is string =>
  typeof value === 'string' && /^pay_[A-Za-z0-9]{8,40}$/.test(value);
