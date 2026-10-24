import mongoose, { Model, Schema } from 'mongoose';

interface IRateLimitBucket {
  key: string;
  count: number;
  expiresAt: Date;
}

const RateLimitBucketSchema = new Schema<IRateLimitBucket>({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

const RateLimitBucket: Model<IRateLimitBucket> =
  (mongoose.models.RateLimitBucket as Model<IRateLimitBucket>) ||
  mongoose.model<IRateLimitBucket>('RateLimitBucket', RateLimitBucketSchema);

export default RateLimitBucket;
