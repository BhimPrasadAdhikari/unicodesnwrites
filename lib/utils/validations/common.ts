import { z } from 'zod';

export const isObjectId = (value: string): boolean => /^[a-f\d]{24}$/i.test(value);

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID');

export const httpUrlSchema = z.string().trim().max(2048).refine((value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}, 'Enter a valid http or https URL');

export const assetUrlSchema = z.string().trim().max(2048).refine((value) => {
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}, 'Enter a valid asset URL');

export const optionalHttpUrlSchema = httpUrlSchema.optional().or(z.literal(''));
export const optionalAssetUrlSchema = assetUrlSchema.optional().or(z.literal(''));
