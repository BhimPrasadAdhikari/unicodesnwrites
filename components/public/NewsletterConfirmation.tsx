'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAnalytics } from '@/hooks/useAnalytics';

export default function NewsletterConfirmation() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    if (!token || !/^[a-f\d]{64}$/i.test(token)) {
      setStatus('error');
      setMessage('Missing confirmation token.');
      trackEvent('newsletter_signup_confirmation_failed', { reason: 'missing_token' });
      return;
    }

    const confirmSubscription = async () => {
      try {
        const res = await fetch(`/api/newsletter/confirm?token=${encodeURIComponent(token)}`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || json.message || 'Confirmation failed');
        }

        setStatus('success');
        setMessage(json.message);
        trackEvent('newsletter_signup_confirmed', {
          source: json.source || 'unknown',
        });
      } catch (error) {
        setStatus('error');
        const resolvedMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        setMessage(resolvedMessage);
        trackEvent('newsletter_signup_confirmation_failed', {
          reason: resolvedMessage,
        });
      }
    };

    confirmSubscription();
  }, [token, trackEvent]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="h-12 w-12 text-muted-foreground animate-spin mb-4" />
        <h2 className="font-serif text-[28px] font-medium leading-tight">Confirming your email...</h2>
        <p className="text-muted-foreground mt-2">Please wait a moment.</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-4">
        <CheckCircle className="h-12 w-12 text-success mb-4" />
        <h2 className="mb-2 font-serif text-[28px] font-medium leading-tight">You&apos;re subscribed.</h2>
        <p className="text-muted-foreground mb-6">
          Thanks for joining! A welcome email is on its way to your inbox.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
            <Link 
                href="/blog"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-foreground px-5 text-[15px] font-medium text-background hover:bg-foreground/90 transition-colors"
            >
                Read the articles
            </Link>
            <Link 
                href="/"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-foreground px-5 text-[15px] font-medium hover:bg-secondary transition-colors"
            >
                Back home
            </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <XCircle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="mb-2 font-serif text-[28px] font-medium leading-tight">Confirmation failed</h2>
      <p className="text-muted-foreground mb-6">{message}</p>
      <p className="text-sm text-muted-foreground mb-6">
          The link might have expired or is invalid. Please try subscribing again.
      </p>
      <Link 
          href="/newsletter"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-foreground px-5 text-[15px] font-medium text-background hover:bg-foreground/90 transition-colors"
      >
          Return to the newsletter
      </Link>
    </div>
  );
}
