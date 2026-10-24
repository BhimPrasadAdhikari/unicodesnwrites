import { NextRequest, NextResponse } from 'next/server';

import { consumeRateLimit, getClientAddress } from '@/lib/auth/security';
import { verifyEmailToken } from '@/lib/auth/verification';
import { verificationSchema } from '@/lib/utils/validations/auth';

export async function POST(request: NextRequest) {
  const parsed = verificationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'This verification link is invalid or expired.' }, { status: 400 });
  const limit = await consumeRateLimit({ scope: 'verify-token-ip', identifier: getClientAddress(request), limit: 20, windowSeconds: 60 * 60 });
  if (!limit.allowed) return NextResponse.json({ error: 'Too many verification attempts. Try again later.' }, { status: 429 });
  const user = await verifyEmailToken(parsed.data.token, parsed.data.password);
  return user
    ? NextResponse.json({ message: 'Email verified. You can now sign in.' })
    : NextResponse.json({ error: 'This verification link is invalid or expired.' }, { status: 400 });
}
