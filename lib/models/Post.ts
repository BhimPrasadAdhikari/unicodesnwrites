import mongoose, { Schema, Model, models } from 'mongoose';
import './User'; // Ensure User model is registered
import { CallbackWithoutResultAndOptionalError } from 'mongoose';

export interface IPost {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  coverImage?: string;
  category: string;
  tags?: string[];
  published: boolean;
  publishedAt?: Date;
  /** Set while the post is in the trash (unpublished, restorable for 30 days). */
  trashedAt?: Date | null;
  author: mongoose.Types.ObjectId | { name: string }; // Populated
  views: number;
  readingTime?: number;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  /** Series linkage — optional, backward-compatible */
  seriesId?: mongoose.Types.ObjectId;
  seriesPart?: number;
  aiSummary?: { tldr: string; keyTakeaways: string[]; targetAudience: string };
  aiSummaryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPost>({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  content: { type: String, required: true }, // MDX content
  excerpt: { type: String, default: '' }, // required to publish; enforced by postSchema
  coverImage: { type: String }, // URL to image
  category: { type: String, default: '' }, // required to publish; enforced by postSchema
  tags: [{ type: String }],
  published: { type: Boolean, default: false },
  publishedAt: { type: Date },
  trashedAt: { type: Date, default: null },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  views: { type: Number, default: 0 },
  readingTime: { type: Number }, // in minutes
  seoTitle: { type: String },
  seoDescription: { type: String },
  seoKeywords: [{ type: String }],
  /** Optional series linkage */
  seriesId: { type: Schema.Types.ObjectId, ref: 'Series' },
  seriesPart: { type: Number },
  // Cached AI summary; `aiSummaryAt` is the post's updatedAt it was made from.
  aiSummary: { type: Schema.Types.Mixed, select: false },
  aiSummaryAt: { type: Date, select: false },
}, {
  timestamps: true
});

// Indexes for performance
PostSchema.index({ published: 1, publishedAt: -1 });
PostSchema.index({ category: 1 });
PostSchema.index({ trashedAt: 1 });
PostSchema.index({ tags: 1 });
PostSchema.index({ seriesId: 1, seriesPart: 1 });

// Avoid model recompilation error in development
export const Post: Model<IPost> = models.Post || mongoose.model<IPost>('Post', PostSchema);
