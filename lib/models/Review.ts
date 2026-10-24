import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReview extends Document {
  product: mongoose.Types.ObjectId;
  customerEmail: string;
  customerName: string;
  rating: number; // 1-5
  comment: string;
  verified: boolean; // Purchased the product
  approved: boolean; // Admin moderation
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema: Schema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    customerEmail: { type: String, required: true },
    customerName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, maxlength: 500 },
    verified: { type: Boolean, default: false },
    approved: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Indexes
ReviewSchema.index({ product: 1, approved: 1 });
ReviewSchema.index({ createdAt: -1 });

const Review: Model<IReview> =
  mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);

export default Review;
