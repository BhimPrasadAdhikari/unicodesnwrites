import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

import { LearnerAccessError, requireAuthenticatedSession } from '@/lib/auth/learner';
import { consumeRateLimit, getClientAddress } from '@/lib/auth/security';
import { connectDB } from '@/lib/db/connection';
import Certificate from '@/lib/models/Certificate';
import CourseEnrollment from '@/lib/models/CourseEnrollment';
import EmailVerificationToken from '@/lib/models/EmailVerificationToken';
import PasswordResetToken from '@/lib/models/PasswordResetToken';
import Purchase from '@/lib/models/Purchase';
import Review from '@/lib/models/Review';
import Comment from '@/lib/models/Comment';
import Subscriber from '@/lib/models/Subscriber';
import { User } from '@/lib/models/User';
import { accountDeleteSchema, accountProfileSchema } from '@/lib/utils/validations/auth';
import LearnerLessonState from '@/lib/models/LearnerLessonState';
import CourseQuizAttempt from '@/lib/models/CourseQuizAttempt';
import LearnerNotebookEntry from '@/lib/models/LearnerNotebookEntry';

function accountError(error: unknown) {
  if (error instanceof LearnerAccessError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
  console.error('Account operation failed:', error instanceof Error ? error.message : 'unknown error');
  return NextResponse.json({ error: 'Account changes are temporarily unavailable.' }, { status: 500 });
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuthenticatedSession();
    const parsed = accountProfileSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Provide valid profile details (name 2-80 chars, bio max 200 chars).' }, { status: 400 });
    await connectDB();
    const user = await User.findByIdAndUpdate(session.user.id, { $set: { name: parsed.data.name, bio: parsed.data.bio } }, { new: true }).select('name bio').lean();
    if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    return NextResponse.json({ name: user.name, bio: user.bio || '', message: 'Profile updated.' });
  } catch (error) {
    return accountError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAuthenticatedSession();
    const parsed = accountDeleteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Enter your password and type DELETE to confirm.' }, { status: 400 });

    const limit = await consumeRateLimit({ scope: 'account-delete', identifier: `${session.user.id}:${getClientAddress(request)}`, limit: 5, windowSeconds: 60 * 60 });
    if (!limit.allowed) return NextResponse.json({ error: 'Too many deletion attempts. Try again later.' }, { status: 429 });

    await connectDB();
    const user = await User.findById(session.user.id).select('email password role').lean();
    if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    if (user.role === 'admin') return NextResponse.json({ error: 'Admin accounts cannot be deleted from learner settings.' }, { status: 409 });
    if (!(await bcrypt.compare(parsed.data.password, user.password))) {
      return NextResponse.json({ error: 'Password is incorrect.' }, { status: 403 });
    }

    const redactedEmail = `deleted-${crypto.createHash('sha256').update(user._id.toString()).digest('hex').slice(0, 20)}@redacted.invalid`;
    await Promise.all([
      // Older purchases kept the email's original case.
      Purchase.updateMany({ customerEmail: user.email }, { $set: { customerEmail: redactedEmail, customerName: 'Deleted customer' } }, { collation: { locale: 'en', strength: 2 } }),
      Review.updateMany({ customerEmail: user.email, emailConfirmed: { $ne: false } }, { $set: { customerEmail: redactedEmail, customerName: 'Deleted learner' } }),
      CourseEnrollment.deleteMany({ user: user._id }),
      Certificate.deleteMany({ user: user._id }),
      LearnerLessonState.deleteMany({ user: user._id }),
      CourseQuizAttempt.deleteMany({ user: user._id }),
      LearnerNotebookEntry.deleteMany({ user: user._id }),
      Comment.deleteMany({ user: user._id }),
      EmailVerificationToken.deleteMany({ userId: user._id }),
      PasswordResetToken.deleteMany({ userId: user._id }),
      Subscriber.deleteMany({ email: user.email }),
    ]);
    await User.deleteOne({ _id: user._id });
    return NextResponse.json({ message: 'Your learner account and associated personal data were deleted.' });
  } catch (error) {
    return accountError(error);
  }
}
