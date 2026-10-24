import crypto from 'crypto';
import type { NextRequest } from 'next/server';

import { connectDB } from '@/lib/db/connection';
import RateLimitBucket from '@/lib/models/RateLimitBucket';

const privateIdentifierKey = process.env.NEXTAUTH_SECRET || crypto.randomBytes(32).toString('hex');

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function hashOpaqueValue(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function hashPrivateIdentifier(value: string) {
  return crypto.createHmac('sha256', privateIdentifierKey).update(value).digest('hex');
}

export function getClientAddress(request: Pick<NextRequest, 'headers'> | { headers: Headers }) {
  return (
    request.headers.get('x-vercel-forwarded-for') ||
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown'
  ).split(',')[0].trim();
}

export function safeInternalPath(value: string | null | undefined, fallback = '/learn') {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  return value;
}

export async function consumeRateLimit(input: {
  scope: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
}) {
  await connectDB();
  const now = new Date();
  const key = `${input.scope}:${hashPrivateIdentifier(input.identifier)}`;
  await RateLimitBucket.deleteOne({ key, expiresAt: { $lte: now } });
  const bucket = await RateLimitBucket.findOneAndUpdate(
    { key },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date(now.getTime() + input.windowSeconds * 1000) },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return { allowed: bucket.count <= input.limit, remaining: Math.max(0, input.limit - bucket.count) };
}
