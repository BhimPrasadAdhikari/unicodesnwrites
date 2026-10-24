import mongoose, { Model, Schema } from 'mongoose';

import type { CourseInput } from '@/lib/utils/validations/course';

export interface ICourseRevision {
  course: mongoose.Types.ObjectId;
  revision: number;
  snapshot: CourseInput;
  author: mongoose.Types.ObjectId;
  reason: 'autosave' | 'manual' | 'publish' | 'restore';
  restoredFromRevision?: number;
  createdAt: Date;
}

const CourseRevisionSchema = new Schema<ICourseRevision>(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    revision: { type: Number, required: true, min: 1 },
    snapshot: { type: Schema.Types.Mixed, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: {
      type: String,
      enum: ['autosave', 'manual', 'publish', 'restore'],
      required: true,
    },
    restoredFromRevision: { type: Number, min: 1 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

CourseRevisionSchema.index({ course: 1, revision: 1 }, { unique: true });
CourseRevisionSchema.index({ course: 1, createdAt: -1 });

const CourseRevision: Model<ICourseRevision> =
  (mongoose.models.CourseRevision as Model<ICourseRevision>) ||
  mongoose.model<ICourseRevision>('CourseRevision', CourseRevisionSchema);

export default CourseRevision;
