import mongoose, { Schema, models, Model } from 'mongoose';

export interface IAnalytics {
  eventId?: string;
  event: string;
  timestamp: Date;
  sessionId?: string;
  visitorId?: string;
  page?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  userAgent?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  device?: string;
  ipHash?: string;
  country?: string;
  city?: string;
  metadata?: Record<string, unknown>;
  postId?: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  productId?: mongoose.Types.ObjectId;
  subscriberId?: mongoose.Types.ObjectId;
  pageLoadTime?: number;
}

const AnalyticsSchema = new Schema<IAnalytics>({
  // Core fields
  eventId: { type: String, unique: true, sparse: true },
  event: { type: String, required: true }, // 'page_view', 'button_click', etc.
  timestamp: { type: Date, default: Date.now, index: true },
  
  // Session tracking
  sessionId: { type: String, index: true }, // Unique session identifier
  visitorId: { type: String, index: true }, // Unique visitor identifier (fingerprint hash)
  
  // Page/URL data
  page: { type: String, index: true }, // URL path (e.g., '/blog/my-post')
  referrer: { type: String }, // Where user came from
  utmSource: { type: String }, // UTM parameters
  utmMedium: { type: String },
  utmCampaign: { type: String },
  utmContent: { type: String },
  utmTerm: { type: String },
  
  // User agent data
  userAgent: { type: String },
  browser: { type: String },
  browserVersion: { type: String },
  os: { type: String }, // 'Windows', 'macOS', 'iOS', etc.
  device: { type: String }, // 'Desktop', 'Mobile', 'Tablet'
  
  // Geographic data
  ipHash: { type: String }, // Hashed IP for privacy
  country: { type: String }, // 'US', 'IN', 'GB', etc.
  city: { type: String },
  
  // Event-specific data
  metadata: { type: Schema.Types.Mixed }, // Flexible JSON data
  
  // Resource IDs (for easier querying)
  postId: { type: Schema.Types.ObjectId, ref: 'Post' },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  subscriberId: { type: Schema.Types.ObjectId, ref: 'Subscriber' },
  
  // Performance data
  pageLoadTime: { type: Number }, // milliseconds
}, { timestamps: { createdAt: true, updatedAt: false } });

// Indexes for performance
AnalyticsSchema.index({ event: 1, timestamp: -1 });
AnalyticsSchema.index({ sessionId: 1, timestamp: -1 });
AnalyticsSchema.index({ visitorId: 1, timestamp: -1 });
AnalyticsSchema.index({ page: 1, timestamp: -1 });
AnalyticsSchema.index({ postId: 1 });
AnalyticsSchema.index({ projectId: 1 });
AnalyticsSchema.index({ productId: 1 });

export const Analytics = (models.Analytics as Model<IAnalytics>) || mongoose.model<IAnalytics>('Analytics', AnalyticsSchema);
