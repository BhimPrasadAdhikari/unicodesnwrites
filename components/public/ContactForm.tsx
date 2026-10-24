"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Send, CheckCircle2 } from 'lucide-react';
import { useEventTracker } from '@/hooks/useEventTracker';
import { useAnalytics } from '@/hooks/useAnalytics';

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { contactSchema } from '@/lib/utils/validation';

type ContactFormInput = z.input<typeof contactSchema>;
type ContactFormData = z.output<typeof contactSchema>;

export default function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactFormInput, unknown, ContactFormData>({
    resolver: zodResolver(contactSchema),
  });
  const { trackEvent } = useEventTracker();
  const { trackEvent: trackProductEvent } = useAnalytics();

  const onSubmit = async (data: ContactFormData) => {
    setStatus('loading');
    
    // Track contact form submission attempt
    trackEvent('contact_form_submit', {
      location: 'contact-page',
      category: 'conversion',
      subject: data.subject || 'general-inquiry',
    });
    trackProductEvent('contact_submit_attempt', { subject: data.subject || 'general-inquiry' });

    try {
      const response = await fetch('/api/contact', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data) 
      });
      
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to send');
      }
      
      setStatus('success');
      trackEvent('contact_form_submit', {
        location: 'contact-page',
        category: 'conversion',
        value: 'success',
      });
      trackProductEvent('contact_submit_success');
      reset();
    } catch {
      setStatus('error');
      trackEvent('contact_form_submit', {
        location: 'contact-page',
        category: 'conversion',
        value: 'error',
      });
      trackProductEvent('contact_submit_error');
    }
  };

  if (status === 'success') {
    return (
      <div className="py-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-7 w-7 text-success" />
          </div>
        </div>
        <h3 className="text-xl font-medium text-foreground mb-2">Message sent</h3>
        <p className="text-muted-foreground mb-6">Thanks for reaching out. I&apos;ll get back to you soon.</p>
        <Button 
          variant="outline"
          onClick={() => setStatus('idle')}
          className="border-border text-foreground hover:bg-muted/50"
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="name" className="flex items-center gap-2 text-sm font-medium">
            Name
          </label>
          <Input
            {...register('name')}
            id="name"
            autoComplete="name"
            maxLength={80}
            placeholder="Your name"
            disabled={status === 'loading'}
            aria-invalid={!!errors.name}
            className={errors.name ? 'border-destructive/50 focus-visible:ring-destructive/50' : ''}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
            Email
          </label>
          <Input
            {...register('email')}
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            placeholder="your@email.com"
            disabled={status === 'loading'}
            aria-invalid={!!errors.email}
            className={errors.email ? 'border-destructive/50 focus-visible:ring-destructive/50' : ''}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
      </div>
      
      <div className="space-y-2">
        <label htmlFor="subject" className="flex items-center gap-2 text-sm font-medium">
          Subject (Optional)
        </label>
        <Input
          {...register('subject')}
          id="subject"
          maxLength={120}
          placeholder="Project inquiry"
          disabled={status === 'loading'}
        />
      </div>
      
      <div className="space-y-2">
        <label htmlFor="message" className="text-sm font-medium">Message</label>
        <textarea
          {...register('message')}
          id="message"
          maxLength={5000}
          rows={6}
          className="flex min-h-[140px] w-full rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/10 focus-visible:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-50 hover:border-foreground/20 resize-none"
          placeholder="How can I help you?"
          disabled={status === 'loading'}
          aria-invalid={!!errors.message}
        />
        {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
      </div>

      <Button
        type="submit"
        disabled={status === 'loading'}
        size="lg"
        className="w-full"
      >
        {status === 'loading' ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Send className="mr-2 h-4 w-4" />
        )}
        Send message
      </Button>
      
      {status === 'error' && (
        <p role="alert" className="text-center text-sm text-destructive">Something went wrong. Please check your details and try again.</p>
      )}
    </form>
  );
}
