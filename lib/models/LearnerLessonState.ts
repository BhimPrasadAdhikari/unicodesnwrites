import mongoose, { Document, Model, Schema } from 'mongoose';

export type LessonWorkspaceTab = 'transcript' | 'notes' | 'quiz';

export interface ILearnerLessonState extends Document {
  user: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  lessonSlug: string;
  notes: string;
  activeTab: LessonWorkspaceTab;
  videoPositionSeconds: number;
  lastAccessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LearnerLessonStateSchema = new Schema<ILearnerLessonState>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  lessonSlug: { type: String, required: true, trim: true, maxlength: 120 },
  notes: { type: String, default: '', maxlength: 20_000 },
  activeTab: { type: String, enum: ['transcript', 'notes', 'quiz'], default: 'transcript' },
  videoPositionSeconds: { type: Number, default: 0, min: 0, max: 86_400 },
  lastAccessedAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

LearnerLessonStateSchema.index({ user: 1, course: 1, lessonSlug: 1 }, { unique: true });
LearnerLessonStateSchema.index({ user: 1, lastAccessedAt: -1 });

const LearnerLessonState: Model<ILearnerLessonState> =
  (mongoose.models.LearnerLessonState as Model<ILearnerLessonState>) ||
  mongoose.model<ILearnerLessonState>('LearnerLessonState', LearnerLessonStateSchema);

export default LearnerLessonState;
