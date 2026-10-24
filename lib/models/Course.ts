import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ITranscriptCue {
  startSeconds: number;
  endSeconds?: number;
  text: string;
}

export interface IQuizQuestion {
  key: string;
  prompt: string;
  options: string[];
  correctOption: number;
  explanation: string;
}

export interface ICourseLesson {
  key: string;
  slug: string;
  title: string;
  summary: string;
  type: 'concept' | 'paper-walkthrough' | 'case-study' | 'visual-intuition';
  youtubeVideoId?: string;
  durationMinutes: number;
  learningObjectives: string[];
  concepts: string[];
  visualization?: {
    title: string;
    description: string;
    variables: Array<{ key: string; label: string; min: number; max: number; step: number; defaultValue: number; unit: string }>;
    relationships: Array<{ source: string; target: string; label: string; driverKey: string; polarity: 'positive' | 'negative'; explanation: string }>;
  };
  simulation?: unknown;
  transcript: ITranscriptCue[];
  studyGuide: {
    mentalModel?: string;
    keyIdeas?: string[];
    misconceptions?: string[];
    recallPrompts?: string[];
    explainBackPrompt?: string;
  };
  quiz: IQuizQuestion[];
  published: boolean;
}

export interface ICourseModule {
  key: string;
  title: string;
  description?: string;
  lessons: ICourseLesson[];
}

export interface ICourse extends Document {
  title: string;
  slug: string;
  eyebrow: string;
  summary: string;
  description: string;
  topic: string;
  level: 'foundation' | 'intermediate' | 'advanced';
  coverImage?: string;
  tags: string[];
  prerequisites: string[];
  learningOutcomes: string[];
  audience: string[];
  instructorName: string;
  featured: boolean;
  status: 'draft' | 'published' | 'archived';
  modules: ICourseModule[];
  revision: number;
  author: mongoose.Types.ObjectId;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TranscriptCueSchema = new Schema<ITranscriptCue>(
  {
    startSeconds: { type: Number, required: true, min: 0 },
    endSeconds: { type: Number, min: 1 },
    text: { type: String, required: true },
  },
  { _id: false }
);

const QuizQuestionSchema = new Schema<IQuizQuestion>(
  {
    key: { type: String, required: true },
    prompt: { type: String, required: true },
    options: { type: [String], required: true },
    correctOption: { type: Number, required: true, min: 0 },
    explanation: { type: String, required: true },
  },
  { _id: false }
);

const CourseLessonSchema = new Schema<ICourseLesson>(
  {
    key: { type: String, required: true },
    slug: { type: String, required: true },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    type: { type: String, enum: ['concept', 'paper-walkthrough', 'case-study'], required: true },
    youtubeVideoId: { type: String, default: '' },
    durationMinutes: { type: Number, required: true, min: 1 },
    learningObjectives: { type: [String], required: true },
    concepts: { type: [String], required: true },
    simulation: { type: Schema.Types.Mixed },
    transcript: { type: [TranscriptCueSchema], default: [] },
    studyGuide: {
      mentalModel: { type: String, default: '' },
      keyIdeas: { type: [String], default: [] },
      misconceptions: { type: [String], default: [] },
      recallPrompts: { type: [String], default: [] },
      explainBackPrompt: { type: String, default: '' },
    },
    quiz: { type: [QuizQuestionSchema], default: [] },
    published: { type: Boolean, default: true },
  },
  { _id: false }
);

const CourseModuleSchema = new Schema<ICourseModule>(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    lessons: { type: [CourseLessonSchema], required: true },
  },
  { _id: false }
);

const CourseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    eyebrow: { type: String, required: true },
    summary: { type: String, required: true },
    description: { type: String, required: true },
    topic: { type: String, required: true, index: true },
    level: { type: String, enum: ['foundation', 'intermediate', 'advanced'], required: true, index: true },
    coverImage: { type: String },
    tags: { type: [String], required: true },
    prerequisites: { type: [String], default: [] },
    learningOutcomes: { type: [String], required: true },
    audience: { type: [String], required: true },
    instructorName: { type: String, required: true },
    featured: { type: Boolean, default: false, index: true },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
    modules: { type: [CourseModuleSchema], required: true },
    revision: { type: Number, required: true, min: 1, default: 1 },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

CourseSchema.index({ status: 1, featured: -1, publishedAt: -1 });
CourseSchema.index({ title: 'text', summary: 'text', tags: 'text' });

const Course: Model<ICourse> =
  (mongoose.models.Course as Model<ICourse>) || mongoose.model<ICourse>('Course', CourseSchema);

export default Course;
