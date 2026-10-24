import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IEmailVerificationToken extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

const EmailVerificationTokenSchema = new Schema<IEmailVerificationToken>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: { createdAt: true, updatedAt: false } });

const EmailVerificationToken: Model<IEmailVerificationToken> =
  (mongoose.models.EmailVerificationToken as Model<IEmailVerificationToken>) ||
  mongoose.model<IEmailVerificationToken>('EmailVerificationToken', EmailVerificationTokenSchema);

export default EmailVerificationToken;
