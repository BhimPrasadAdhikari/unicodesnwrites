import { z } from 'zod';
import { cleanMultiline, cleanSingleLine } from '@/lib/utils/sanitize';
import { assetUrlSchema, optionalAssetUrlSchema, optionalHttpUrlSchema } from '@/lib/utils/validations/common';

export const projectSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(100, 'Title is too long').transform(cleanSingleLine),
  slug: z.string().trim().min(1, 'Slug is required').max(120).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  shortDescription: z.string().trim().min(10, 'Short description must be at least 10 characters').max(200, 'Short description must be under 200 characters').transform(cleanSingleLine),
  longDescription: z.string().trim().min(50, 'Long description needs more detail').max(50_000, 'Long description is too long').transform(cleanMultiline),
  category: z.string().trim().min(1, 'Category is required').max(80).transform(cleanSingleLine),
  techStack: z.array(z.string().trim().min(1).max(80).transform(cleanSingleLine)).min(1, 'At least one technology is required').max(30),
  
  thumbnailImage: optionalAssetUrlSchema,
  images: z.array(assetUrlSchema).max(10).optional(),
  
  githubUrl: optionalHttpUrlSchema,
  demoUrl: optionalHttpUrlSchema,
  
  status: z.enum(['In Progress', 'Completed', 'Archived', 'Maintained']),
  featured: z.boolean().default(false),
  published: z.boolean().default(false),
  
  tags: z.array(z.string().trim().min(1).max(50).transform(cleanSingleLine)).max(20).optional(),
  challenges: z.string().trim().max(20_000).transform(cleanMultiline).optional(),
  learnings: z.string().trim().max(20_000).transform(cleanMultiline).optional(),
  
  teamMembers: z.array(z.object({
    name: z.string().trim().min(1).max(100).transform(cleanSingleLine),
    role: z.string().trim().min(1).max(100).transform(cleanSingleLine),
    link: optionalHttpUrlSchema,
  })).max(20).optional(),
  
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
}).refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
  path: ['endDate'],
  message: 'End date must be on or after the start date',
});

export type ProjectFormData = z.infer<typeof projectSchema>;
