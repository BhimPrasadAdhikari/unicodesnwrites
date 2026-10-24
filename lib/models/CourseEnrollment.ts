import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICourseEnrollment extends Document {
  user: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  status: 'active' | 'completed';
  completedLessonSlugs: string[];
  lastLessonSlug?: string;
  enrolledAt: Date;
  lastAccessedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CourseEnrollmentSchema = new Schema<ICourseEnrollment>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  status: { type: String, enum: ['active', 'completed'], default: 'active', index: true },
  completedLessonSlugs: { type: [String], default: [] },
  lastLessonSlug: { type: String, trim: true, maxlength: 120 },
  enrolledAt: { type: Date, default: Date.now },
  lastAccessedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
}, { timestamps: true });

CourseEnrollmentSchema.index({ user: 1, course: 1 }, { unique: true });
CourseEnrollmentSchema.index({ course: 1, enrolledAt: -1 });

const CourseEnrollment: Model<ICourseEnrollment> =
  (mongoose.models.CourseEnrollment as Model<ICourseEnrollment>) ||
  mongoose.model<ICourseEnrollment>('CourseEnrollment', CourseEnrollmentSchema);

export default CourseEnrollment;
