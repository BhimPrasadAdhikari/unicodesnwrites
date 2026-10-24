import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPasswordResetToken extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

const PasswordResetTokenSchema = new Schema<IPasswordResetToken>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: { createdAt: true, updatedAt: false } });

const PasswordResetToken: Model<IPasswordResetToken> =
  (mongoose.models.PasswordResetToken as Model<IPasswordResetToken>) ||
  mongoose.model<IPasswordResetToken>('PasswordResetToken', PasswordResetTokenSchema);

export default PasswordResetToken;
