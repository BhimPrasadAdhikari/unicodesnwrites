'use client';

import { useState } from 'react';
import { AlertCircle, CreditCard, Loader2 } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';

interface CheckoutButtonProps {
  productId: string;
  priceId?: string;
  email?: string;
}

export default function CheckoutButton({ productId, priceId, email }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { trackEvent } = useAnalytics();

  const handleCheckout = async () => {
    if (!/^[a-f\d]{24}$/i.test(productId)) {
      setErrorMessage('This product is unavailable for checkout.');
      return;
    }

    trackEvent('product_buy_click', { productId, priceId });
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          email, 
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Checkout failed');
      }

      const { url } = await res.json() as { url?: string };
      
      if (url) {
        const checkoutUrl = new URL(url);
        if (checkoutUrl.protocol !== 'https:' || (checkoutUrl.hostname !== 'checkout.stripe.com' && !checkoutUrl.hostname.endsWith('.stripe.com'))) {
          throw new Error('Checkout returned an invalid destination');
        }
        window.location.assign(checkoutUrl.toString());
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Checkout could not be started.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading || !priceId}
        aria-describedby={errorMessage ? 'checkout-error' : undefined}
        className="group flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-primary px-8 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
        {loading ? 'Opening secure checkout…' : priceId ? 'Buy now' : 'Currently unavailable'}
      </button>
      {errorMessage && <p id="checkout-error" role="alert" className="mt-3 flex items-start gap-2 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{errorMessage}</p>}
    </div>
  );
}
