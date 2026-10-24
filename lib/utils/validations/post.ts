import { z } from 'zod';
import { cleanMultiline, cleanSingleLine } from '@/lib/utils/sanitize';
import { objectIdSchema, optionalAssetUrlSchema } from '@/lib/utils/validations/common';

export const postSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title too long').transform(cleanSingleLine),
  slug: z.string().trim()
    .min(1, 'Slug is required')
    .max(160, 'Slug is too long')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens'),
  content: z.string().trim().min(1, 'Content is required').max(200_000, 'Content is too long').transform(cleanMultiline),
  // Excerpt and category may be blank on drafts; they're required to publish (see superRefine below).
  excerpt: z.string().trim().max(300, 'Excerpt must be 300 characters or fewer').transform(cleanMultiline).default(''),
  coverImage: optionalAssetUrlSchema,
  category: z.string().trim().max(80).transform(cleanSingleLine).default(''),
  tags: z.array(z.string().trim().min(1).max(50).transform(cleanSingleLine)).max(20).default([]),
  published: z.boolean().default(false),
  /** Optional publish date (ISO). A future date schedules the post; empty means "now" on first publish. */
  publishedAt: z.string().datetime({ offset: true }).optional().nullable().or(z.literal('')),
  seoTitle: z.string().trim().max(60, 'SEO title must be 60 characters or fewer').transform(cleanSingleLine).optional(),
  seoDescription: z.string().trim().max(160, 'SEO description must be 160 characters or fewer').transform(cleanSingleLine).optional(),
  seoKeywords: z.array(z.string().trim().min(1).max(50).transform(cleanSingleLine)).max(20).default([]),
  /** Optional series assignment */
  seriesId: objectIdSchema.optional().or(z.literal('')),
  seriesPart: z.number().int().min(1).optional(),
}).superRefine((post, ctx) => {
  if (!post.published) return;
  if (!post.excerpt) ctx.addIssue({ code: 'custom', path: ['excerpt'], message: 'Excerpt is required to publish' });
  if (!post.category) ctx.addIssue({ code: 'custom', path: ['category'], message: 'Category is required to publish' });
});

export type PostFormData = z.infer<typeof postSchema>;

