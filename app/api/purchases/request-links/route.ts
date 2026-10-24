import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { consumeRateLimit, getClientAddress, normalizeEmail } from '@/lib/auth/security';
import { emailFreshDownloadLinks } from '@/lib/services/purchase';

const bodySchema = z.object({ email: z.string().trim().email().max(254) });

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter the email you used at checkout.' }, { status: 400 });
  }
  const email = normalizeEmail(parsed.data.email);

  const [ipLimit, emailLimit] = await Promise.all([
    consumeRateLimit({ scope: 'download-links-ip', identifier: getClientAddress(req), limit: 10, windowSeconds: 60 * 60 }),
    consumeRateLimit({ scope: 'download-links-email', identifier: email, limit: 3, windowSeconds: 24 * 60 * 60 }),
  ]);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  try {
    await emailFreshDownloadLinks(email);
  } catch (error) {
    console.error('Failed to send fresh download links', error);
  }

  return NextResponse.json({ message: 'If that email has purchases, fresh download links are on their way.' });
}
