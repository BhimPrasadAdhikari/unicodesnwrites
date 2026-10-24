import mongoose, { Document, Model, Schema } from 'mongoose';

export type UserRole = 'admin' | 'author' | 'learner';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  bio?: string;
  role: UserRole;
  emailVerified?: Date;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  bio: { type: String, trim: true, maxlength: 200, default: '' },
  role: { type: String, enum: ['admin', 'author', 'learner'], default: 'learner', index: true },
  emailVerified: { type: Date },
  tokenVersion: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema);
