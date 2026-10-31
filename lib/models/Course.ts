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

export interface ICodeWalkthroughStep {
  title: string;
  markdown: string;
  file: string;
  startLine?: number;
  endLine?: number;
}

export interface ILessonResource {
  key: string;
  title: string;
  description: string;
  kind: 'notebook' | 'cheatsheet' | 'repo' | 'slides' | 'dataset' | 'link';
  url: string;
}

export interface ILessonExercise {
  key: string;
  title: string;
  prompt: string;
  hints: string[];
  solution: string;
}

export interface ICourseLesson {
  key: string;
  slug: string;
  title: string;
  summary: string;
  type: 'concept' | 'paper-walkthrough' | 'case-study' | 'visual-intuition';
  youtubeVideoId?: string;
  /** Self-hosted video (mp4/webm). Used instead of YouTube when set. */
  videoUrl?: string;
  videoPosterUrl?: string;
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
  /** Key of a built-in interactive visualization (see components/course-interactives). */
  interactive?: { component: string; title: string; caption: string };
  article?: string;
  codeWalkthrough?: { title: string; files: Record<string, string>; steps: ICodeWalkthroughStep[] };
  resources: ILessonResource[];
  exercises: ILessonExercise[];
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

const LessonResourceSchema = new Schema<ILessonResource>(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    kind: { type: String, enum: ['notebook', 'cheatsheet', 'repo', 'slides', 'dataset', 'link'], required: true },
    url: { type: String, required: true },
  },
  { _id: false }
);

const LessonExerciseSchema = new Schema<ILessonExercise>(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    prompt: { type: String, required: true },
    hints: { type: [String], default: [] },
    solution: { type: String, required: true },
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
    videoUrl: { type: String, default: '' },
    videoPosterUrl: { type: String, default: '' },
    durationMinutes: { type: Number, required: true, min: 1 },
    learningObjectives: { type: [String], required: true },
    concepts: { type: [String], required: true },
    simulation: { type: Schema.Types.Mixed },
    interactive: {
      type: new Schema({ component: String, title: String, caption: String }, { _id: false }),
      default: undefined,
    },
    article: { type: String, default: '' },
    // files is a filename -> source map, so it is stored as a plain object.
    codeWalkthrough: { type: Schema.Types.Mixed, default: undefined },
    resources: { type: [LessonResourceSchema], default: [] },
    exercises: { type: [LessonExerciseSchema], default: [] },
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
