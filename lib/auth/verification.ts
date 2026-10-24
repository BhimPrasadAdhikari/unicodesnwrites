import crypto from 'crypto';

import { connectDB } from '@/lib/db/connection';
import EmailVerificationToken from '@/lib/models/EmailVerificationToken';
import { User } from '@/lib/models/User';
import { hashOpaqueValue } from '@/lib/auth/security';
import bcrypt from 'bcryptjs';

const TOKEN_TTL_MS = 30 * 60 * 1000;

export async function issueEmailVerificationToken(userId: string) {
  await connectDB();
  const token = crypto.randomBytes(32).toString('base64url');
  await EmailVerificationToken.deleteMany({ userId });
  await EmailVerificationToken.create({
    userId,
    tokenHash: hashOpaqueValue(token),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });
  return token;
}

export async function verifyEmailToken(token: string, password: string) {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) return null;
  await connectDB();
  const record = await EmailVerificationToken.findOne({
    tokenHash: hashOpaqueValue(token),
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!record) return null;

  const pendingUser = await User.findById(record.userId).select('password role emailVerified').lean();
  if (!pendingUser || pendingUser.role !== 'learner' || pendingUser.emailVerified || !(await bcrypt.compare(password, pendingUser.password))) {
    return null;
  }

  const consumed = await EmailVerificationToken.findOneAndDelete({
    _id: record._id,
    tokenHash: record.tokenHash,
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!consumed) return null;

  const user = await User.findByIdAndUpdate(
    consumed.userId,
    { $set: { emailVerified: new Date() }, $inc: { tokenVersion: 1 } },
    { new: true }
  ).select('_id email').lean();
  return user ? { id: user._id.toString(), email: user.email } : null;
}
