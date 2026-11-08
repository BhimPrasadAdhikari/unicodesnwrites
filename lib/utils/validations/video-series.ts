import { z } from 'zod';

import { cleanMultiline, cleanSingleLine } from '@/lib/utils/sanitize';
import { extractYouTubeVideoId } from '@/lib/utils/youtube';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const videoPartSchema = z.object({
  title: z.string().trim().min(1, 'Every part needs a title').max(160).transform(cleanSingleLine),
  // Accepts a bare 11-character id or any YouTube URL; stores the id.
  videoId: z
    .string()
    .trim()
    .max(2048)
    .transform((value, ctx) => {
      const id = extractYouTubeVideoId(value);
      if (!id) {
        ctx.addIssue({ code: 'custom', message: `Not a YouTube video link or id: ${value.slice(0, 80)}` });
        return z.NEVER;
      }
      return id;
    }),
  summary: z.string().trim().max(400).transform(cleanSingleLine).optional().default(''),
  publishAt: z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid release date and time')
    .transform((value) => new Date(value)),
  keywords: z
    .array(z.string().trim().toLowerCase().max(80).transform(cleanSingleLine))
    .max(30)
    .default([])
    .transform((list) => [...new Set(list.filter(Boolean))]),
});

export const videoSeriesSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(120).transform(cleanSingleLine),
  slug: z.string().trim().min(1, 'Slug is required').max(120).regex(SLUG_PATTERN, 'Slug must be lowercase with hyphens'),
  description: z.string().trim().max(2000).transform(cleanMultiline).optional().default(''),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
  parts: z.array(videoPartSchema).max(100).default([]),
});

export type VideoSeriesInput = z.input<typeof videoSeriesSchema>;
export type VideoSeriesData = z.output<typeof videoSeriesSchema>;
