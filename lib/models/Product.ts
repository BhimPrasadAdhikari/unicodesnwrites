import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduct extends Document {
  title: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  price: number; // in paise
  currency: string;
  productType: 'E-book' | 'Course' | 'Template' | 'Code' | 'Assets';
  category: string;
  tags: string[];
  thumbnailImage: string;
  galleryImages: string[];
  fileUrl: string; // Private
  fileName: string;
  fileSize: number;
  fileSizeDisplay: string;
  previewFiles: Array<{
    type: 'pdf' | 'video' | 'image';
    url: string;
    title?: string; // caption shown to buyers, max 120 characters
  }>;
  whatsIncluded: string[];
  requirements?: string;
  licenseType: 'Personal' | 'Commercial' | 'Extended';
  version: string;
  published: boolean;
  featured: boolean;
  totalSales: number;
  totalRevenue: number;
  views: number;
  author: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema(
  {
    title: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    shortDescription: { type: String, required: true, maxlength: 200 },
    longDescription: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', enum: ['INR'] },
    productType: {
      type: String,
      enum: ['E-book', 'Course', 'Template', 'Code', 'Assets'],
      required: true,
    },
    category: { type: String, required: true },
    tags: [{ type: String }],
    thumbnailImage: { type: String, required: true },
    galleryImages: [{ type: String }],
    // The storage URL of the paid file. Never sent to readers: queries that need it
    // (downloads, the admin editor) ask for it with .select('+fileUrl').
    fileUrl: { type: String, required: true, select: false },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    fileSizeDisplay: { type: String, required: true },
    previewFiles: [
      {
        type: { type: String, enum: ['pdf', 'video', 'image'] },
        url: { type: String },
        title: { type: String, trim: true, maxlength: 120 },
      },
    ],
    whatsIncluded: [{ type: String }],
    requirements: { type: String },
    licenseType: {
      type: String,
      enum: ['Personal', 'Commercial', 'Extended'],
      default: 'Personal',
    },
    version: { type: String, default: '1.0' },
    published: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    totalSales: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
ProductSchema.index({ published: 1, featured: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ tags: 1 });

// Avoid model recompilation error in development
const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
