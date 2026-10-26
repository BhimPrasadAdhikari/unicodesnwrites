'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CreditCard, Loader2 } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';

interface CheckoutButtonProps {
  productId: string;
  available: boolean;
  email?: string;
}

interface CheckoutSession {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  productTitle: string;
  prefillEmail?: string;
}

interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.failed', handler: (response: { error?: { description?: string } }) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';
let checkoutScript: Promise<void> | null = null;

const loadCheckoutScript = () => {
  if (window.Razorpay) return Promise.resolve();
  checkoutScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      checkoutScript = null;
      script.remove();
      reject(new Error('Could not load the payment window. Check your connection and try again.'));
    };
    document.body.appendChild(script);
  });
  return checkoutScript;
};

export default function CheckoutButton({ productId, available, email }: CheckoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { trackEvent } = useAnalytics();

  const handleCheckout = async () => {
    if (!/^[a-f\d]{24}$/i.test(productId)) {
      setErrorMessage('This product is unavailable for checkout.');
      return;
    }

    trackEvent('product_buy_click', { productId });
    setLoading(true);
    setErrorMessage('');
    try {
      const [res] = await Promise.all([
        fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, email }),
        }),
        loadCheckoutScript(),
      ]);

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Checkout failed');
      }

      const session = await res.json() as CheckoutSession;
      if (!window.Razorpay) throw new Error('Payment window is unavailable.');

      const razorpay = new window.Razorpay({
        key: session.keyId,
        order_id: session.orderId,
        amount: session.amount,
        currency: session.currency,
        name: 'unicodesnwrites',
        description: session.productTitle,
        prefill: session.prefillEmail ? { email: session.prefillEmail } : undefined,
        theme: { color: '#C8321A' },
        handler: async (response: RazorpaySuccess) => {
          setLoading(true);
          try {
            await fetch('/api/checkout/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            });
          } finally {
            // The success page confirms the order itself (webhook or API fallback)
            // even if the verify call above was lost.
            router.push(`/products/success?order_id=${encodeURIComponent(response.razorpay_order_id)}`);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            trackEvent('product_checkout_dismissed', { productId });
          },
        },
      });

      razorpay.on('payment.failed', (response) => {
        setErrorMessage(response.error?.description || 'The payment did not go through. You can try again.');
      });
      razorpay.open();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Checkout could not be started.');
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading || !available}
        aria-describedby={errorMessage ? 'checkout-error' : undefined}
        className="group flex w-full items-center justify-center gap-3 rounded-xl bg-foreground px-8 py-3.5 font-medium text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
        {loading ? 'Opening secure checkout…' : available ? 'Buy now' : 'Currently unavailable'}
      </button>
      {errorMessage && <p id="checkout-error" role="alert" className="mt-3 flex items-start gap-2 text-sm text-red-600"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{errorMessage}</p>}
    </div>
  );
}
