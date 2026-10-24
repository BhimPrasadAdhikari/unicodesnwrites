'use client';

import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reviewSchema } from '@/lib/utils/validation';
import { z } from 'zod';
import { Star, Loader2, Check } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';

type ReviewFormInput = z.input<typeof reviewSchema>;
type ReviewFormData = z.output<typeof reviewSchema>;

export default function ReviewForm({ productId }: { productId: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const formId = useId();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReviewFormInput, unknown, ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      productId,
      rating: 5,
      comment: '',
      name: '',
      email: '',
    },
  });

  const rating = watch('rating');

  const onSubmit = async (data: ReviewFormData) => {
    setLoading(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const payload = await res.json().catch(() => null);
        setSubmitError(payload?.error || 'We could not submit your review. Please check the form and try again.');
      }
    } catch {
      setSubmitError('We could not reach the review service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="py-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 text-success mb-4">
          <Check size={28} />
        </div>
        <h3 className="text-xl font-medium mb-2">Review submitted</h3>
        <p className="text-muted-foreground">
          Thank you for your feedback. Your review will appear once approved by our team.
        </p>
      </div>
    );
  }

  return (
    <div className="pt-8 border-t border-border">
      <h3 className="text-xl font-medium mb-6">Write a review</h3>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <span id={`${formId}-rating-label`} className="mb-2 block text-sm font-medium text-muted-foreground">Rating</span>
          <div role="radiogroup" aria-labelledby={`${formId}-rating-label`} className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                onClick={() => setValue('rating', star)}
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star} star${star === 1 ? '' : 's'}`}
                className={`flex h-11 w-11 items-center justify-center rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${star <= rating ? 'text-warning' : 'text-muted-foreground/30'} hover:text-warning`}
              >
                <Star size={28} fill={star <= rating ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${formId}-name`} className="mb-2 block text-sm font-medium text-muted-foreground">Name</label>
            <input
              {...register('name')}
              id={`${formId}-name`}
              autoComplete="name"
              maxLength={80}
              aria-invalid={!!errors.name}
              className="w-full rounded-lg border border-input bg-card px-4 py-3 text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
              placeholder="Your name"
            />
            {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label htmlFor={`${formId}-email`} className="mb-2 block text-sm font-medium text-muted-foreground">Email</label>
            <input
              {...register('email')}
              id={`${formId}-email`}
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              aria-invalid={!!errors.email}
              className="w-full rounded-lg border border-input bg-card px-4 py-3 text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
              placeholder="your@email.com"
            />
            {errors.email && <p className="text-destructive text-sm mt-1">{errors.email.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor={`${formId}-comment`} className="mb-2 block text-sm font-medium text-muted-foreground">Review</label>
          <textarea
            {...register('comment')}
            id={`${formId}-comment`}
            minLength={10}
            maxLength={1000}
            aria-invalid={!!errors.comment}
            className="w-full rounded-lg border border-input bg-card px-4 py-3 text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 h-28 resize-none"
            placeholder="Share your experience with this product..."
          />
          {errors.comment && <p className="text-destructive text-sm mt-1">{errors.comment.message}</p>}
        </div>

        {submitError && (
          <Alert variant="destructive">
            {submitError}
          </Alert>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-foreground font-medium text-background transition-colors hover:bg-foreground/90 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" /> : null}
          Submit Review
        </button>
      </form>
    </div>
  );
}
