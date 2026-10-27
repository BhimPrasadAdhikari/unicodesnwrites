import mongoose, { Model, Schema } from 'mongoose';
import crypto from 'crypto';

// Addresses an admin deleted from the subscriber list. Only a hash is kept, so
// the suppression list itself does not hold the address it is suppressing.
interface ISuppressedEmail {
  emailHash: string;
  createdAt: Date;
}

const SuppressedEmailSchema = new Schema<ISuppressedEmail>({
  emailHash: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

export function hashSuppressedEmail(email: string): string {
  return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

const SuppressedEmail: Model<ISuppressedEmail> =
  (mongoose.models.SuppressedEmail as Model<ISuppressedEmail>) ||
  mongoose.model<ISuppressedEmail>('SuppressedEmail', SuppressedEmailSchema);

export default SuppressedEmail;
