import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

import { LearnerAccessError, requireAuthenticatedSession } from '@/lib/auth/learner';
import { consumeRateLimit, getClientAddress } from '@/lib/auth/security';
import { connectDB } from '@/lib/db/connection';
import PasswordResetToken from '@/lib/models/PasswordResetToken';
import { User } from '@/lib/models/User';
import { accountPasswordSchema } from '@/lib/utils/validations/auth';

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuthenticatedSession();
    const parsed = accountPasswordSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Check your password details.' }, { status: 400 });
    if (parsed.data.currentPassword === parsed.data.password) {
      return NextResponse.json({ error: 'Choose a password you are not already using.' }, { status: 400 });
    }

    const limit = await consumeRateLimit({ scope: 'account-password', identifier: `${session.user.id}:${getClientAddress(request)}`, limit: 8, windowSeconds: 60 * 60 });
    if (!limit.allowed) return NextResponse.json({ error: 'Too many password attempts. Try again later.' }, { status: 429 });

    await connectDB();
    const user = await User.findById(session.user.id).select('password').lean();
    if (!user || !(await bcrypt.compare(parsed.data.currentPassword, user.password))) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 403 });
    }

    const password = await bcrypt.hash(parsed.data.password, 12);
    await User.updateOne({ _id: session.user.id }, { $set: { password }, $inc: { tokenVersion: 1 } });
    await PasswordResetToken.deleteMany({ userId: session.user.id });
    return NextResponse.json({ message: 'Password updated. Sign in again on your devices.' });
  } catch (error) {
    if (error instanceof LearnerAccessError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    console.error('Password update failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Password changes are temporarily unavailable.' }, { status: 500 });
  }
}
