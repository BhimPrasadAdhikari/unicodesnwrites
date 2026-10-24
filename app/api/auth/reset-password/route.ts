import { NextRequest, NextResponse } from 'next/server';

import { resetPasswordWithToken } from '@/lib/auth/password-reset';
import { consumeRateLimit, getClientAddress } from '@/lib/auth/security';
import { passwordResetSchema } from '@/lib/utils/validations/auth';

export async function POST(request: NextRequest) {
  const parsed = passwordResetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'This reset link is invalid or expired.' }, { status: 400 });
  }
  const limit = await consumeRateLimit({ scope: 'password-reset-token-ip', identifier: getClientAddress(request), limit: 15, windowSeconds: 60 * 60 });
  if (!limit.allowed) return NextResponse.json({ error: 'Too many reset attempts. Try again later.' }, { status: 429 });

  const reset = await resetPasswordWithToken(parsed.data.token, parsed.data.password);
  return reset
    ? NextResponse.json({ message: 'Password updated. Sign in with your new password.' })
    : NextResponse.json({ error: 'This reset link is invalid or expired.' }, { status: 400 });
}
