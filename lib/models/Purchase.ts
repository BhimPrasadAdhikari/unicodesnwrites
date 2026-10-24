import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPurchase extends Document {
  purchaseId: string;
  product: mongoose.Types.ObjectId;
  customerEmail: string;
  customerName?: string;
  amount: number; // in cents
  currency: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  downloadToken: string;
  downloadTokenExpiry: Date;
  downloadCount: number;
  maxDownloads: number;
  emailSent: boolean;
  emailSentAt?: Date;
  purchasedAt: Date;
  refundedAt?: Date;
  metadata?: Record<string, unknown>;
}

const PurchaseSchema: Schema = new Schema(
  {
    purchaseId: { type: String, required: true, unique: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    customerEmail: { type: String, required: true },
    customerName: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    stripeSessionId: { type: String, required: true, unique: true },
    stripePaymentIntentId: { type: String, unique: true, sparse: true },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    downloadToken: { type: String, unique: true, sparse: true },
    downloadTokenExpiry: { type: Date },
    downloadCount: { type: Number, default: 0 },
    maxDownloads: { type: Number, default: 5 },
    emailSent: { type: Boolean, default: false },
    emailSentAt: { type: Date },
    purchasedAt: { type: Date, default: Date.now },
    refundedAt: { type: Date },
    metadata: { type: Object },
  },
  {
    timestamps: true,
  }
);

// Indexes

PurchaseSchema.index({ customerEmail: 1 });
PurchaseSchema.index({ purchasedAt: -1 });

const Purchase: Model<IPurchase> =
  mongoose.models.Purchase || mongoose.model<IPurchase>('Purchase', PurchaseSchema);

export default Purchase;
