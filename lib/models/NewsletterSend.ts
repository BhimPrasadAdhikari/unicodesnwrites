import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INewsletterSend extends Document {
  newsletter: mongoose.Types.ObjectId;
  subscriber: mongoose.Types.ObjectId;
  email: string;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'bounced';
  attemptCount: number;
  nextAttemptAt?: Date;
  lastAttemptAt?: Date;
  leaseToken?: string;
  leaseExpiresAt?: Date;
  sentAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NewsletterSendSchema = new Schema<INewsletterSend>(
  {
    newsletter: {
      type: Schema.Types.ObjectId,
      ref: 'Newsletter',
      required: true,
    },
    subscriber: {
      type: Schema.Types.ObjectId,
      ref: 'Subscriber',
      required: true,
    },
    email: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'sent', 'failed', 'bounced'],
      default: 'pending',
      index: true,
    },
    sentAt: {
      type: Date,
    },
    attemptCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    nextAttemptAt: {
      type: Date,
      index: true,
    },
    lastAttemptAt: {
      type: Date,
    },
    leaseToken: {
      type: String,
    },
    leaseExpiresAt: {
      type: Date,
      index: true,
    },
    openedAt: {
      type: Date,
    },
    clickedAt: {
      type: Date,
    },
    failureReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate sends and allow efficient lookup
NewsletterSendSchema.index({ newsletter: 1, subscriber: 1 }, { unique: true });
NewsletterSendSchema.index({ newsletter: 1, status: 1, nextAttemptAt: 1, leaseExpiresAt: 1 });

const NewsletterSend: Model<INewsletterSend> = mongoose.models.NewsletterSend || mongoose.model<INewsletterSend>('NewsletterSend', NewsletterSendSchema);

export default NewsletterSend;
