import mongoose, { Schema, Model, models } from 'mongoose';

/**
 * A YouTube video series (e.g. "LLM Inference"). Parts are kept in watch
 * order; a part whose `publishAt` is in the future is shown as "coming" and
 * never embedded, so scheduled (still private) videos are not exposed early.
 */
export interface IVideoPart {
  _id?: mongoose.Types.ObjectId;
  title: string;
  videoId: string;
  summary?: string;
  publishAt: Date;
  /** Lower-case phrases used to attach this part to matching blog posts. */
  keywords: string[];
}

export interface IVideoSeries {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  description?: string;
  published: boolean;
  /** Featured series get a teaser card on /blog and /courses. */
  featured: boolean;
  parts: IVideoPart[];
  createdAt: Date;
  updatedAt: Date;
}

const VideoPartSchema = new Schema<IVideoPart>({
  title: { type: String, required: true },
  videoId: { type: String, required: true, match: /^[A-Za-z0-9_-]{11}$/ },
  summary: { type: String },
  publishAt: { type: Date, required: true },
  keywords: { type: [String], default: [] },
});

const VideoSeriesSchema = new Schema<IVideoSeries>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    published: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    parts: { type: [VideoPartSchema], default: [] },
  },
  { timestamps: true }
);

VideoSeriesSchema.index({ published: 1, featured: 1 });

export const VideoSeries: Model<IVideoSeries> =
  models.VideoSeries || mongoose.model<IVideoSeries>('VideoSeries', VideoSeriesSchema);
