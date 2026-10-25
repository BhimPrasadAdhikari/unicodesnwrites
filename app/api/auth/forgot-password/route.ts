import { NextRequest, NextResponse } from 'next/server';

import { issuePasswordResetToken } from '@/lib/auth/password-reset';
import { consumeRateLimit, getClientAddress } from '@/lib/auth/security';
import { connectDB } from '@/lib/db/connection';
import { User } from '@/lib/models/User';
import { sendPasswordResetEmail } from '@/lib/services/email';
import { passwordResetRequestSchema } from '@/lib/utils/validations/auth';

const genericMessage = 'If an account exists for this email, a reset link is on its way.';

export async function POST(request: NextRequest) {
  const parsed = passwordResetRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });

  const [ipLimit, emailLimit] = await Promise.all([
    consumeRateLimit({ scope: 'password-reset-ip', identifier: getClientAddress(request), limit: 10, windowSeconds: 60 * 60 }),
    consumeRateLimit({ scope: 'password-reset-email', identifier: parsed.data.email, limit: 3, windowSeconds: 60 * 60 }),
  ]);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    return NextResponse.json({ error: 'Too many reset requests. Try again later.' }, { status: 429 });
  }

  await connectDB();
  // Unverified accounts may reset too: the emailed link proves the address, and resetting verifies it.
  const user = await User.findOne({ email: parsed.data.email }).select('_id email name').lean();
  if (user) {
    try {
      const token = await issuePasswordResetToken(user._id.toString());
      await sendPasswordResetEmail({ email: user.email, name: user.name, token });
    } catch (error) {
      console.error('Password reset email failed:', error instanceof Error ? error.message : 'unknown error');
    }
  }

  return NextResponse.json({ message: genericMessage }, { status: 202 });
}
