import mongoose, { Schema, Document, Model, models } from 'mongoose';

export interface IProject extends Document {
  title: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  category: string;
  techStack?: string[];
  thumbnailImage?: string;
  images?: string[];
  githubUrl?: string;
  demoUrl?: string;
  status: 'In Progress' | 'Completed' | 'Archived' | 'Maintained';
  featured: boolean;
  published: boolean;
  tags?: string[];
  challenges?: string;
  learnings?: string;
  teamMembers?: { name: string; role: string; link?: string }[];
  startDate?: Date;
  endDate?: Date;
  views: number;
  githubStats?: {
    stars?: number;
    forks?: number;
    language?: string;
    lastUpdated?: Date;
    cachedAt?: Date;
  };
  author: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema({
  title: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  shortDescription: { type: String, required: true, maxlength: 200 },
  longDescription: { type: String, required: true }, // MDX or rich text
  category: { type: String, required: true }, // e.g., 'Full-Stack', 'AI/ML'
  techStack: [{ type: String }],
  
  // Media
  thumbnailImage: { type: String }, // Main image for cards
  images: [{ type: String }], // Gallery images
  
  // Links
  githubUrl: { type: String },
  demoUrl: { type: String },
  
  // Status & Visibility
  status: { 
    type: String, 
    enum: ['In Progress', 'Completed', 'Archived', 'Maintained'],
    default: 'In Progress' 
  },
  featured: { type: Boolean, default: false },
  published: { type: Boolean, default: false },
  
  // Metadata
  tags: [{ type: String }],
  challenges: { type: String },
  learnings: { type: String },
  teamMembers: [{
    name: String,
    role: String,
    link: String
  }],
  startDate: { type: Date },
  endDate: { type: Date },
  
  // Stats
  views: { type: Number, default: 0 },
  githubStats: {
    stars: Number,
    forks: Number,
    language: String,
    lastUpdated: Date,
    cachedAt: Date
  },
  
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { 
  timestamps: true // adds createdAt, updatedAt
});

// Indexes for common queries
ProjectSchema.index({ category: 1 });
ProjectSchema.index({ techStack: 1 });
ProjectSchema.index({ featured: 1, sortOrder: 1 });
ProjectSchema.index({ published: 1, createdAt: -1 });

export const Project: Model<IProject> = models.Project || mongoose.model<IProject>('Project', ProjectSchema);
