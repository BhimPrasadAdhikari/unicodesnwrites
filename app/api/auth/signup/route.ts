import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

import { consumeRateLimit, getClientAddress, safeInternalPath } from '@/lib/auth/security';
import { issueEmailVerificationToken } from '@/lib/auth/verification';
import { connectDB } from '@/lib/db/connection';
import { User } from '@/lib/models/User';
import { sendAccountVerificationEmail } from '@/lib/services/email';
import { signupSchema } from '@/lib/utils/validations/auth';

const genericMessage = 'If this address can be registered, a verification email is on its way.';

export async function POST(request: NextRequest) {
  const parsed = signupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Check your account details.' }, { status: 400 });
  }

  const address = getClientAddress(request);
  const [ipLimit, emailLimit] = await Promise.all([
    consumeRateLimit({ scope: 'signup-ip', identifier: address, limit: 8, windowSeconds: 60 * 60 }),
    consumeRateLimit({ scope: 'signup-email', identifier: parsed.data.email, limit: 4, windowSeconds: 60 * 60 }),
  ]);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    return NextResponse.json({ error: 'Too many account requests. Try again later.' }, { status: 429 });
  }

  try {
    await connectDB();
    let user = await User.findOne({ email: parsed.data.email });
    if (user?.emailVerified || (user && user.role !== 'learner')) {
      return NextResponse.json({ message: genericMessage }, { status: 202 });
    }

    // A pending account keeps its first password: letting a repeat sign-up replace it would let
    // anyone lock the real owner out of verifying. The owner gets a fresh link instead, and can
    // set a new password through "Forgot password", which proves they hold the inbox.
    if (!user) {
      user = await User.create({
        name: parsed.data.name,
        email: parsed.data.email,
        password: await bcrypt.hash(parsed.data.password, 12),
        role: 'learner',
      });
    }

    const token = await issueEmailVerificationToken(user._id.toString());
    await sendAccountVerificationEmail({
      email: user.email,
      name: user.name,
      token,
      returnTo: parsed.data.returnTo ? safeInternalPath(parsed.data.returnTo) : undefined,
    });
    return NextResponse.json({ message: genericMessage }, { status: 202 });
  } catch (error) {
    console.error('Signup failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'We could not send the verification email. Try again shortly.' }, { status: 503 });
  }
}
