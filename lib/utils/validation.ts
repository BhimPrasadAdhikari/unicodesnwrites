import { z } from 'zod';
import { cleanMultiline, cleanSingleLine } from '@/lib/utils/sanitize';
import { assetUrlSchema, objectIdSchema, optionalAssetUrlSchema } from '@/lib/utils/validations/common';

const normalizedEmail = z
  .string()
  .trim()
  .max(254, 'Email address is too long')
  .email('Invalid email address')
  .transform((value) => value.toLowerCase());

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name is too long').transform(cleanSingleLine),
  email: normalizedEmail,
  subject: z.string().trim().max(120, 'Subject is too long').transform(cleanSingleLine).optional(),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(5000, 'Message is too long').transform(cleanMultiline),
});

export const productSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(120).transform(cleanSingleLine),
  slug: z.string().trim().min(3, 'Slug must be at least 3 characters').max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must use lowercase letters, numbers, and hyphens'),
  shortDescription: z.string().trim().min(10).max(200, 'Short description must be under 200 characters').transform(cleanSingleLine),
  longDescription: z.string().trim().min(10, 'Long description is required').max(50_000).transform(cleanMultiline),
  price: z.number().finite().min(0, 'Price must be positive').max(1_000_000),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default('USD'),
  productType: z.enum(['E-book', 'Course', 'Template', 'Code', 'Assets']),
  category: z.string().trim().min(1, 'Category is required').max(80).transform(cleanSingleLine),
  tags: z.array(z.string().trim().min(1).max(50).transform(cleanSingleLine)).max(20),
  thumbnailImage: optionalAssetUrlSchema,
  galleryImages: z.array(assetUrlSchema).max(12).optional(),
  fileUrl: optionalAssetUrlSchema,
  fileName: z.string().trim().max(255).transform(cleanSingleLine).optional().or(z.literal('')),
  fileSize: z.number().finite().min(0).max(100 * 1024 * 1024).optional(),
  fileSizeDisplay: z.string().trim().max(40).transform(cleanSingleLine).optional(),
  previewFiles: z.array(
    z.object({
      type: z.enum(['pdf', 'video', 'image']),
      url: assetUrlSchema,
    })
  ).max(20).optional(),
  whatsIncluded: z.array(z.string().trim().max(200).transform(cleanSingleLine)).max(50).transform((values) => values.filter(Boolean)).optional(),
  requirements: z.string().trim().max(10_000).transform(cleanMultiline).optional(),
  licenseType: z.enum(['Personal', 'Commercial', 'Extended']),
  version: z.string().trim().max(40).transform(cleanSingleLine).optional(),
  published: z.boolean().optional(),
  featured: z.boolean().optional(),
});

export const reviewSchema = z.object({
  productId: objectIdSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(10, 'Review must be at least 10 characters').max(500, 'Review is too long (500 characters max)').transform(cleanMultiline),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name is too long').transform(cleanSingleLine),
  email: normalizedEmail,
});

export const purchaseSchema = z.object({
  productId: objectIdSchema,
  amount: z.number().finite().min(0).max(1_000_000),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default('USD'),
});

export const checkoutSchema = z.object({
  productId: objectIdSchema,
  email: normalizedEmail.optional().or(z.literal('')),
});
