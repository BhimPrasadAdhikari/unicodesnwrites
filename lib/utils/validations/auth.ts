import { z } from 'zod';

export const emailSchema = z.string().trim().email().max(254).transform((value) => value.toLowerCase());

export const passwordSchema = z.string()
  .min(12, 'Use at least 12 characters')
  .max(72, 'Password is too long')
  .refine((value) => new TextEncoder().encode(value).length <= 72, 'Password is too long')
  .regex(/[a-z]/, 'Add a lowercase letter')
  .regex(/[A-Z]/, 'Add an uppercase letter')
  .regex(/[0-9]/, 'Add a number');

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
  returnTo: z.string().max(500).optional(),
});

export const resendVerificationSchema = z.object({ email: emailSchema, returnTo: z.string().max(500).optional() });
export const verificationSchema = z.object({ token: z.string().min(40).max(100), password: passwordSchema });
export const passwordResetRequestSchema = z.object({ email: emailSchema });
export const passwordResetSchema = z.object({ token: z.string().min(40).max(100), password: passwordSchema });
export const accountProfileSchema = z.object({ name: z.string().trim().min(2).max(80), bio: z.string().trim().max(200).optional().default('') });
export const accountPasswordSchema = z.object({ currentPassword: z.string().min(1).max(72), password: passwordSchema });
export const accountDeleteSchema = z.object({ password: z.string().min(1).max(72), confirmation: z.literal('DELETE') });
