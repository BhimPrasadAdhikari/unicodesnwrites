import mongoose, { Schema, Model, models } from 'mongoose';

export interface ISeries {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  description?: string;
  coverImage?: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SeriesSchema = new Schema<ISeries>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    coverImage: { type: String },
    published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

SeriesSchema.index({ published: 1 });

export const Series: Model<ISeries> =
  models.Series || mongoose.model<ISeries>('Series', SeriesSchema);
