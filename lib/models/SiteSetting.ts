import mongoose, { Model, Schema } from 'mongoose';

// Small site-wide settings, one document per key. Readers of a key validate the
// value and fall back to defaults, so a missing or malformed document is safe.
export interface ISiteSetting {
  key: string;
  value: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const SiteSettingSchema = new Schema<ISiteSetting>(
  {
    key: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
    value: { type: Schema.Types.Mixed },
  },
  { timestamps: true, minimize: false },
);

const SiteSetting: Model<ISiteSetting> =
  (mongoose.models.SiteSetting as Model<ISiteSetting>) ||
  mongoose.model<ISiteSetting>('SiteSetting', SiteSettingSchema);

export default SiteSetting;
