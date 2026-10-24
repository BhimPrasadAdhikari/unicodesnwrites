'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, CheckCircle, AlertCircle, Send } from 'lucide-react';
import { useEventTracker } from '@/hooks/useEventTracker';
import { useAnalytics } from '@/hooks/useAnalytics';
import confetti from 'canvas-confetti';
import { subscribeSchema } from '@/lib/utils/validations/newsletter';
import { Alert } from '@/components/ui/Alert';

const schema = subscribeSchema.omit({ source: true });

type NewsletterFormInput = z.input<typeof schema>;
type NewsletterFormData = z.output<typeof schema>;

interface NewsletterSignupFormProps {
  source?:
    | 'homepage'
    | 'blog'
    | 'blog-sidebar'
    | 'blog-post-inline'
    | 'blog-post-end'
    | 'footer'
    | 'import'
    | 'api'
    | 'newsletter-page';
  variant?: 'inline' | 'card' | 'minimal';
  className?: string;
  /** Called immediately after a successful subscription — useful for popups */
  onSubscribeSuccess?: () => void;
}

export default function NewsletterSignupForm({
  source = 'homepage',
  variant = 'card',
  className = '',
  onSubscribeSuccess,
}: NewsletterSignupFormProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const formId = useId();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewsletterFormInput, unknown, NewsletterFormData>({
    resolver: zodResolver(schema),
  });

  const { trackEvent } = useEventTracker();
  const { trackEvent: trackProductEvent } = useAnalytics();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasTrackedImpression = useRef(false);

  useEffect(() => {
    if (hasTrackedImpression.current) {
      return;
    }

    const target = containerRef.current;
    if (!target) {
      return;
    }

    const trackImpression = () => {
      if (hasTrackedImpression.current) {
        return;
      }

      hasTrackedImpression.current = true;
      trackEvent('newsletter_signup', { location: source, category: 'conversion' });
      trackProductEvent('newsletter_signup_impression', { source });
    };

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      trackImpression();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          trackImpression();
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [source, trackEvent, trackProductEvent]);

  const onSubmit = async (data: NewsletterFormData) => {
    setStatus('loading');
    setMessage('');
    
    // Track attempt
    trackEvent('newsletter_signup', { location: source, category: 'conversion' });
    trackProductEvent('newsletter_signup_attempt', { source });

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          source,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || json.error || 'Something went wrong');
      }

      setStatus('success');
      setMessage(json.message);

      // Track success
      trackEvent('newsletter_signup', { 
        location: source,
        category: 'conversion',
        value: 'success',
      });
      trackProductEvent('newsletter_signup_success', { source });

      // 🎉 Confetti burst
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ffffff'],
      });

      onSubscribeSuccess?.();
      reset();
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  if (status === 'success') {
    return (
      <div ref={containerRef} role="status" className={`rounded-xl p-6 text-center ${className}`}>
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-success/10">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
        </div>
        <h3 className="text-lg font-medium mb-2">Check your inbox</h3>
        <p className="text-muted-foreground text-sm">{message || 'Check your inbox for a confirmation link.'}</p>
        <button
            onClick={() => setStatus('idle')}
            className="mt-6 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
        >
            Subscribe another email →
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`${variant === 'card' ? '' : ''} ${className}`}>
      {variant !== 'minimal' && (
        <div className="mb-6">
            <h3 className="font-serif text-2xl font-medium">Subscribe to Letters</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Name is optional. Email is all it takes.
            </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {variant === 'card' && (
             <div>
             <label htmlFor={`${formId}-name`} className="sr-only">Name (Optional)</label>
             <input
               {...register('name')}
               id={`${formId}-name`}
               type="text"
               autoComplete="name"
               maxLength={80}
               placeholder="Your Name (Optional)"
               aria-invalid={!!errors.name}
               className="w-full h-12 rounded-lg border border-input bg-card px-4 text-base transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
             />
             {errors.name && <p role="alert" className="mt-1.5 text-xs text-destructive">{errors.name.message}</p>}
           </div>
        )}
       
        <div>
          <label htmlFor={`${formId}-email`} className="sr-only">Email</label>
          <div className="relative">
            <input
              {...register('email')}
              id={`${formId}-email`}
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              placeholder="Enter your email"
              aria-invalid={!!errors.email}
              className={`w-full h-12 rounded-lg border bg-card px-4 text-base transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 ${errors.email ? 'border-destructive' : 'border-input'}`}
            />
          </div>
          {errors.email && (
            <p role="alert" className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
              <span className="h-1 w-1 rounded-full bg-destructive" />
              {errors.email.message}
            </p>
          )}
        </div>

        {status === 'error' && (
          <Alert variant="destructive" className="gap-2 p-3">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{message}</span>
          </Alert>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 font-medium text-primary-foreground transition-colors duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 hover:bg-primary/90"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Subscribing...
            </>
          ) : (
            <>
              Subscribe
              <Send className="h-4 w-4" />
            </>
          )}
        </button>
        
        <p className="mt-3 text-[13px] text-muted-foreground">
            Double opt-in: one email to confirm, then nothing until there&apos;s something worth reading. Unsubscribe any time.
        </p>
      </form>
    </div>
  );
}
