import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICourseQuizAttempt extends Document {
  user: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  lessonSlug: string;
  answers: Array<{ questionKey: string; selectedOption: number }>;
  results: Array<{ questionKey: string; correct: boolean; selectedOption: number | null; correctOption: number; explanation: string }>;
  score: number;
  passed: boolean;
  correctCount: number;
  total: number;
  attemptedAt: Date;
  createdAt: Date;
}

const CourseQuizAttemptSchema = new Schema<ICourseQuizAttempt>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  lessonSlug: { type: String, required: true, trim: true, maxlength: 120 },
  answers: [{
    questionKey: { type: String, required: true, maxlength: 120 },
    selectedOption: { type: Number, required: true, min: 0, max: 5 },
    _id: false,
  }],
  results: [{
    questionKey: { type: String, required: true, maxlength: 120 },
    correct: { type: Boolean, required: true },
    selectedOption: { type: Number, min: 0, max: 5, default: null },
    correctOption: { type: Number, required: true, min: 0, max: 5 },
    explanation: { type: String, required: true, maxlength: 2_000 },
    _id: false,
  }],
  score: { type: Number, required: true, min: 0, max: 100 },
  passed: { type: Boolean, required: true, index: true },
  correctCount: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  attemptedAt: { type: Date, default: Date.now, index: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

CourseQuizAttemptSchema.index({ user: 1, course: 1, lessonSlug: 1, attemptedAt: -1 });
CourseQuizAttemptSchema.index({ course: 1, attemptedAt: -1 });

const CourseQuizAttempt: Model<ICourseQuizAttempt> =
  (mongoose.models.CourseQuizAttempt as Model<ICourseQuizAttempt>) ||
  mongoose.model<ICourseQuizAttempt>('CourseQuizAttempt', CourseQuizAttemptSchema);

export default CourseQuizAttempt;
