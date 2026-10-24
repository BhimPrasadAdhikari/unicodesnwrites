import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ILearnerNotebookEntry extends Document {
  user: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  courseTitle: string;
  courseSlug: string;
  lessonTitle: string;
  lessonSlug: string;
  focus: string;
  title: string;
  explanation: string;
  evidence: string[];
  checkYourself: string;
  createdAt: Date;
  updatedAt: Date;
}

const LearnerNotebookEntrySchema = new Schema<ILearnerNotebookEntry>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  courseTitle: { type: String, required: true, maxlength: 160 },
  courseSlug: { type: String, required: true, maxlength: 120 },
  lessonTitle: { type: String, required: true, maxlength: 160 },
  lessonSlug: { type: String, required: true, maxlength: 120 },
  focus: { type: String, required: true, maxlength: 300 },
  title: { type: String, required: true, maxlength: 200 },
  explanation: { type: String, required: true, maxlength: 6_000 },
  evidence: { type: [String], required: true, default: [], validate: [(items: string[]) => items.length <= 12, 'Too many evidence items'] },
  checkYourself: { type: String, required: true, maxlength: 1_000 },
}, { timestamps: true });

LearnerNotebookEntrySchema.index({ user: 1, createdAt: -1 });
LearnerNotebookEntrySchema.index({ user: 1, course: 1, lessonSlug: 1, createdAt: -1 });

const LearnerNotebookEntry: Model<ILearnerNotebookEntry> =
  (mongoose.models.LearnerNotebookEntry as Model<ILearnerNotebookEntry>) ||
  mongoose.model<ILearnerNotebookEntry>('LearnerNotebookEntry', LearnerNotebookEntrySchema);

export default LearnerNotebookEntry;
