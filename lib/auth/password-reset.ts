import crypto from 'crypto';
import bcrypt from 'bcryptjs';

import { connectDB } from '@/lib/db/connection';
import EmailVerificationToken from '@/lib/models/EmailVerificationToken';
import PasswordResetToken from '@/lib/models/PasswordResetToken';
import { User } from '@/lib/models/User';
import { hashOpaqueValue } from '@/lib/auth/security';

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export async function issuePasswordResetToken(userId: string) {
  await connectDB();
  const token = crypto.randomBytes(32).toString('base64url');
  await PasswordResetToken.deleteMany({ userId });
  await PasswordResetToken.create({
    userId,
    tokenHash: hashOpaqueValue(token),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });
  return token;
}

export async function resetPasswordWithToken(token: string, password: string) {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) return false;
  await connectDB();
  const record = await PasswordResetToken.findOne({
    tokenHash: hashOpaqueValue(token),
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!record) return false;

  const passwordHash = await bcrypt.hash(password, 12);
  const consumed = await PasswordResetToken.findOneAndDelete({
    _id: record._id,
    tokenHash: record.tokenHash,
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!consumed) return false;

  const user = await User.findByIdAndUpdate(consumed.userId, {
    $set: { password: passwordHash },
    $inc: { tokenVersion: 1 },
  }).lean();
  await PasswordResetToken.deleteMany({ userId: consumed.userId });
  if (user && !user.emailVerified) {
    // The reset link arrived in this inbox, which proves the address: finish verification too.
    await User.updateOne({ _id: consumed.userId, emailVerified: { $exists: false } }, { $set: { emailVerified: new Date() } });
    await EmailVerificationToken.deleteMany({ userId: consumed.userId });
  }
  return Boolean(user);
}
