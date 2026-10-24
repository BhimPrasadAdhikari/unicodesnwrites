import { NextRequest, NextResponse } from 'next/server';

import { consumeRateLimit, getClientAddress, safeInternalPath } from '@/lib/auth/security';
import { issueEmailVerificationToken } from '@/lib/auth/verification';
import { connectDB } from '@/lib/db/connection';
import { User } from '@/lib/models/User';
import { sendAccountVerificationEmail } from '@/lib/services/email';
import { resendVerificationSchema } from '@/lib/utils/validations/auth';

const message = 'If an unverified account exists, a new email is on its way.';

export async function POST(request: NextRequest) {
  const parsed = resendVerificationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });

  const [ipLimit, emailLimit] = await Promise.all([
    consumeRateLimit({ scope: 'verify-resend-ip', identifier: getClientAddress(request), limit: 10, windowSeconds: 60 * 60 }),
    consumeRateLimit({ scope: 'verify-resend-email', identifier: parsed.data.email, limit: 3, windowSeconds: 60 * 60 }),
  ]);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  await connectDB();
  const user = await User.findOne({ email: parsed.data.email, role: 'learner', emailVerified: { $exists: false } });
  if (user) {
    try {
      const token = await issueEmailVerificationToken(user._id.toString());
      await sendAccountVerificationEmail({
        email: user.email,
        name: user.name,
        token,
        returnTo: parsed.data.returnTo ? safeInternalPath(parsed.data.returnTo) : undefined,
      });
    } catch (error) {
      console.error('Verification resend failed:', error instanceof Error ? error.message : 'unknown error');
    }
  }
  return NextResponse.json({ message }, { status: 202 });
}
