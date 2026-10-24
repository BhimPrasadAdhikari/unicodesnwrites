import mongoose, { Schema, models } from 'mongoose';

const ContactSubmissionSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String },
  message: { type: String, required: true },
  status: { type: String, enum: ['new', 'read', 'replied'], default: 'new' },
  submittedAt: { type: Date, default: Date.now },
});

ContactSubmissionSchema.index({ submittedAt: -1 });

export const ContactSubmission = models.ContactSubmission || mongoose.model('ContactSubmission', ContactSubmissionSchema);
