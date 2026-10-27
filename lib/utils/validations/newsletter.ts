import { z } from 'zod';
import { cleanMultiline, cleanSingleLine } from '@/lib/utils/sanitize';
import { objectIdSchema } from '@/lib/utils/validations/common';
import { BOUNCED_TAG, subscriberTagListSchema } from '@/lib/utils/validations/subscriber';

export const newsletterSourceSchema = z.enum([
  'homepage',
  'blog',
  'blog-sidebar',
  'blog-post-inline',
  'blog-post-end',
  'footer',
  'import',
  'api',
  'newsletter-page',
]);

export const newsletterStatusSchema = z.enum(['draft', 'scheduled', 'sending', 'sent', 'failed']);

export const subscribeSchema = z.object({
  email: z.string().trim().max(254, 'Email address is too long').email('Please enter a valid email address').transform((value) => value.toLowerCase()),
  name: z.string().trim().max(80, 'Name is too long').transform(cleanSingleLine).optional(),
  source: newsletterSourceSchema.optional().default('homepage'),
});

export const createNewsletterSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required').max(150, 'Subject is too long').transform(cleanSingleLine),
  previewText: z.string().trim().max(200, 'Preview text is too long').transform(cleanSingleLine).optional(),
  content: z.string().trim().min(1, 'Content is required').max(200_000, 'Content is too long').transform(cleanMultiline),
  template: z.enum(['simple', 'branded', 'digest']).default('simple'),
  scheduledFor: z.string().datetime().optional().nullable(), // ISO date string coming from frontend
});

// Editing can only move an issue between draft and scheduled. Sending, sent and failed are set
// by the delivery code; letting a PATCH set them would skip its checks or lock the issue.
// audienceTags: empty sends to every confirmed subscriber.
export const updateNewsletterSchema = createNewsletterSchema.partial().extend({
  status: z.enum(['draft', 'scheduled']).optional(),
  audienceTags: subscriberTagListSchema
    .refine((tags) => !tags.includes(BOUNCED_TAG), 'Bounced subscribers are never emailed.')
    .optional(),
});

export const sendNewsletterSchema = z.object({
  newsletterId: objectIdSchema,
  force: z.boolean().optional(), // Force send even if validation warnings
});

export const unsubscribeSchema = z.object({
  email: z.string().trim().max(254).email().transform((value) => value.toLowerCase()),
  token: z.string().regex(/^[a-f\d]{64}$/i, 'Invalid unsubscribe token'),
  reason: z.string().trim().max(500, 'Reason is too long').transform(cleanMultiline).optional(),
});
