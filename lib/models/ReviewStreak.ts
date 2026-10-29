import mongoose, { Document, Model, Schema } from 'mongoose';

// Consecutive days with at least one review. Days are calendar dates (YYYY-MM-DD)
// in the learner's own time zone as reported by their browser, falling back to UTC.
export interface IReviewStreak extends Document {
  user: mongoose.Types.ObjectId;
  currentStreak: number;
  longestStreak: number;
  lastReviewDay: string;
  timeZone: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewStreakSchema = new Schema<IReviewStreak>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  currentStreak: { type: Number, required: true, min: 0, default: 0 },
  longestStreak: { type: Number, required: true, min: 0, default: 0 },
  lastReviewDay: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  timeZone: { type: String, required: true, maxlength: 64, default: 'UTC' },
}, { timestamps: true });

const ReviewStreak: Model<IReviewStreak> =
  (mongoose.models.ReviewStreak as Model<IReviewStreak>) ||
  mongoose.model<IReviewStreak>('ReviewStreak', ReviewStreakSchema);

export default ReviewStreak;
