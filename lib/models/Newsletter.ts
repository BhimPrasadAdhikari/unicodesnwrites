import mongoose, { Schema, Document, Model } from 'mongoose';

export const NEWSLETTER_STATUSES = ['draft', 'scheduled', 'sending', 'paused', 'sent', 'failed', 'cancelled'] as const;
export type NewsletterStatus = (typeof NEWSLETTER_STATUSES)[number];
/** Campaigns whose delivery queue is open: at most one of these may exist at a time. */
export const IN_FLIGHT_STATUSES = ['sending', 'paused'] as const;

export interface INewsletter extends Document {
  subject: string;
  previewText?: string;
  content: string;
  contentPlainText?: string;
  template: 'simple' | 'branded' | 'digest';
  /** What the campaign was built from: hand-written, a single article, or a digest of articles. */
  kind: 'custom' | 'article' | 'digest';
  /** Blog posts featured in this campaign; used to stop an article being emailed twice. */
  posts: mongoose.Types.ObjectId[];
  /**
   * `paused`: the email provider refused mail (quota, rate limit, bad credentials);
   * the scheduler resumes it after `resumeAfter`. `cancelled`: an admin stopped it,
   * recipients still pending are never sent.
   */
  status: NewsletterStatus;
  pausedReason?: string;
  resumeAfter?: Date;
  scheduledFor?: Date;
  sentAt?: Date;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  openedCount?: number;
  clickedCount?: number;
  deliveryInitializedAt?: Date;
  deliveryInitializationToken?: string;
  deliveryInitializationLeaseExpiresAt?: Date;
  author: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NewsletterSchema = new Schema<INewsletter>(
  {
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    previewText: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    contentPlainText: {
      type: String,
    },
    template: {
      type: String,
      enum: ['simple', 'branded', 'digest'],
      default: 'simple',
    },
    kind: {
      type: String,
      enum: ['custom', 'article', 'digest'],
      default: 'custom',
    },
    posts: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
      default: [],
      index: true,
    },
    status: {
      type: String,
      enum: NEWSLETTER_STATUSES,
      default: 'draft',
      index: true,
    },
    pausedReason: {
      type: String,
    },
    resumeAfter: {
      type: Date,
    },
    scheduledFor: {
      type: Date,
    },
    sentAt: {
      type: Date,
      index: true,
    },
    recipientCount: {
      type: Number,
      default: 0,
    },
    sentCount: {
      type: Number,
      default: 0,
    },
    failedCount: {
      type: Number,
      default: 0,
    },
    openedCount: {
      type: Number,
      default: 0,
    },
    clickedCount: {
      type: Number,
      default: 0,
    },
    deliveryInitializedAt: {
      type: Date,
    },
    deliveryInitializationToken: {
      type: String,
    },
    deliveryInitializationLeaseExpiresAt: {
      type: Date,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Newsletter: Model<INewsletter> = mongoose.models.Newsletter || mongoose.model<INewsletter>('Newsletter', NewsletterSchema);

export default Newsletter;
