import mongoose, { Document, Model, Schema } from 'mongoose';

// A quiz question the learner got wrong, scheduled for spaced repetition.
// The card stores only a pointer to the question; prompt, options and the correct
// answer are always read from the published course, so they can't be tampered with.
export interface IReviewCard extends Document {
  user: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  lessonSlug: string;
  questionKey: string;
  /** 0 = new or lapsed; 1-5 map to the 1, 3, 7, 16 and 35 day intervals */
  box: number;
  intervalDays: number;
  dueAt: Date;
  lastReviewedAt?: Date;
  lapses: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewCardSchema = new Schema<IReviewCard>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  lessonSlug: { type: String, required: true, trim: true, maxlength: 120 },
  questionKey: { type: String, required: true, maxlength: 120 },
  box: { type: Number, required: true, min: 0, max: 5, default: 0 },
  intervalDays: { type: Number, required: true, min: 0, default: 0 },
  dueAt: { type: Date, required: true, default: Date.now },
  lastReviewedAt: { type: Date },
  lapses: { type: Number, required: true, min: 0, default: 0 },
  reviewCount: { type: Number, required: true, min: 0, default: 0 },
}, { timestamps: true });

ReviewCardSchema.index({ user: 1, course: 1, lessonSlug: 1, questionKey: 1 }, { unique: true });
ReviewCardSchema.index({ user: 1, dueAt: 1 });

const ReviewCard: Model<IReviewCard> =
  (mongoose.models.ReviewCard as Model<IReviewCard>) ||
  mongoose.model<IReviewCard>('ReviewCard', ReviewCardSchema);

export default ReviewCard;
