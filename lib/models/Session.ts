import mongoose, { Schema, models, Model } from 'mongoose';

export interface ISession {
  sessionId: string;
  visitorId: string;
  startedAt: Date;
  lastActivityAt: Date;
  endedAt?: Date;
  duration?: number;
  entryPage?: string;
  exitPage?: string;
  pageViews: number;
  events: number;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  userAgent?: string;
  browser?: string;
  os?: string;
  device?: string;
  ipHash?: string;
  country?: string;
  city?: string;
  isNewVisitor: boolean;
  converted: boolean;
  conversionType?: string;
}

const SessionSchema = new Schema<ISession>({
  sessionId: { type: String, required: true, unique: true, index: true },
  visitorId: { type: String, required: true, index: true },
  
  // Session timing
  startedAt: { type: Date, required: true, index: true },
  lastActivityAt: { type: Date, required: true },
  endedAt: { type: Date },
  duration: { type: Number }, // seconds
  
  // Session data
  entryPage: { type: String },
  exitPage: { type: String },
  pageViews: { type: Number, default: 0 },
  events: { type: Number, default: 0 },
  
  // Visitor data (captured once per session)
  referrer: { type: String },
  utmSource: { type: String },
  utmMedium: { type: String },
  utmCampaign: { type: String },
  
  userAgent: { type: String },
  browser: { type: String },
  os: { type: String },
  device: { type: String },
  
  ipHash: { type: String },
  country: { type: String },
  city: { type: String },
  
  // Flags
  isNewVisitor: { type: Boolean, default: false },
  converted: { type: Boolean, default: false },
  conversionType: { type: String }, // 'newsletter_signup', 'purchase', 'contact_form'
}, { timestamps: true });

// Indexes
SessionSchema.index({ visitorId: 1, startedAt: -1 });

// Helper method to check if session is expired (e.g. > 30 mins)
SessionSchema.methods.isExpired = function(timeoutMinutes = 30) {
  if (this.endedAt) return true;
  const now = new Date();
  const diff = (now.getTime() - this.lastActivityAt.getTime()) / 1000 / 60;
  return diff > timeoutMinutes;
};

export const Session = (models.Session as Model<ISession>) || mongoose.model<ISession>('Session', SessionSchema);
