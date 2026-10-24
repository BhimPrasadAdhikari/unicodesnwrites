import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';

export interface ISubscriber extends Document {
  email: string;
  name?: string;
  status: 'pending' | 'confirmed' | 'unsubscribed';
  confirmationToken?: string;
  confirmationTokenExpiry?: Date;
  confirmedAt?: Date;
  subscribedAt: Date;
  unsubscribedAt?: Date;
  source:
    | 'homepage'
    | 'blog'
    | 'blog-sidebar'
    | 'blog-post-inline'
    | 'blog-post-end'
    | 'footer'
    | 'import'
    | 'api'
    | 'newsletter-page';
  ipAddress?: string;
  userAgent?: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  generateConfirmationToken(): string;
  isTokenValid(token: string): boolean;
}

const SubscriberSchema = new Schema<ISubscriber>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'unsubscribed'],
      default: 'pending',
      index: true,
    },
    confirmationToken: {
      type: String,
      unique: true,
      sparse: true, // Only index if exists
    },
    confirmationTokenExpiry: {
      type: Date,
    },
    confirmedAt: {
      type: Date,
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    unsubscribedAt: {
      type: Date,
    },
    source: {
      type: String,
      enum: [
        'homepage',
        'blog',
        'blog-sidebar',
        'blog-post-inline',
        'blog-post-end',
        'footer',
        'import',
        'api',
        'newsletter-page',
      ],
      default: 'homepage',
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    tags: {
      type: [String],
      default: [],
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
SubscriberSchema.index({ confirmedAt: -1 });

// Methods
SubscriberSchema.methods.generateConfirmationToken = function(this: ISubscriber): string {
  const token = crypto.randomBytes(32).toString('hex');
  this.confirmationToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // Token expires in 7 days
  this.confirmationTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  return token; // Return original token to send to user (we store hash)
};

SubscriberSchema.methods.isTokenValid = function(this: ISubscriber, token: string): boolean {
  if (!this.confirmationToken || !this.confirmationTokenExpiry) {
    return false;
  }
  
  const now = new Date();
  if (now > this.confirmationTokenExpiry) {
    return false;
  }
  
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
    
  return this.confirmationToken === hashedToken;
};

// Handle checking for existing model to prevent overwrite during hot reload
const Subscriber: Model<ISubscriber> = mongoose.models.Subscriber || mongoose.model<ISubscriber>('Subscriber', SubscriberSchema);

export default Subscriber;
