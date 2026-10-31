import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * A course certificate: issued once per learner per course when the enrollment is completed.
 * Names and titles are snapshots so a later rename never changes a certificate already shared.
 */
export interface ICertificate extends Document {
  user: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  enrollment: mongoose.Types.ObjectId;
  /** Public, URL-safe id used in /certificates/<code> */
  code: string;
  /** The account name when the certificate was issued */
  learnerName: string;
  /** The name the learner chose to show instead (empty = learnerName) */
  displayName?: string;
  courseTitle: string;
  completedAt: Date;
  issuedAt: Date;
  averageQuizScore?: number;
  /** The learner hid it: the public page shows "not found" */
  hidden: boolean;
  /** An admin revoked it: the public page shows "not found" */
  revokedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CertificateSchema = new Schema<ICertificate>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  enrollment: { type: Schema.Types.ObjectId, ref: 'CourseEnrollment', required: true },
  code: { type: String, required: true, trim: true, maxlength: 32 },
  learnerName: { type: String, required: true, trim: true, maxlength: 120 },
  displayName: { type: String, trim: true, maxlength: 80, default: '' },
  courseTitle: { type: String, required: true, trim: true, maxlength: 200 },
  completedAt: { type: Date, required: true },
  issuedAt: { type: Date, default: Date.now },
  averageQuizScore: { type: Number, min: 0, max: 100 },
  hidden: { type: Boolean, default: false },
  revokedAt: { type: Date, default: null },
}, { timestamps: true });

CertificateSchema.index({ code: 1 }, { unique: true });
CertificateSchema.index({ user: 1, course: 1 }, { unique: true });

const Certificate: Model<ICertificate> =
  (mongoose.models.Certificate as Model<ICertificate>) ||
  mongoose.model<ICertificate>('Certificate', CertificateSchema);

export default Certificate;
