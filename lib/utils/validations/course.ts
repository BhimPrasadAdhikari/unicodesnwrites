import { z } from 'zod';

import { cleanMultiline, cleanSingleLine } from '@/lib/utils/sanitize';
import { optionalAssetUrlSchema } from '@/lib/utils/validations/common';
import { extractYouTubeVideoId } from '@/lib/utils/youtube';

export const AIML_TOPICS = [
  'ai-foundations',
  'neural-networks',
  'deep-learning',
  'transformers',
  'language-models',
  'llm-training',
  'alignment',
  'retrieval',
  'agents',
  'evaluation',
  'multimodal-ai',
  'ai-safety',
] as const;

export const COURSE_LEVELS = ['foundation', 'intermediate', 'advanced'] as const;
export const CONCEPT_LESSON_TYPES = ['concept', 'paper-walkthrough', 'case-study'] as const;
export type ConceptLessonType = (typeof CONCEPT_LESSON_TYPES)[number];

// Lesson types that were retired but may still exist in stored courses and
// revision snapshots. They are mapped to a current type wherever stored data
// is read back, so legacy documents stay editable (scripts/migrate-legacy-lesson-types.ts
// rewrites them permanently).
export const LEGACY_LESSON_TYPE_MAP: Record<string, ConceptLessonType> = {
  'visual-intuition': 'concept',
};

export function normalizeLessonType(value: unknown): unknown {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(LEGACY_LESSON_TYPE_MAP, value)
    ? LEGACY_LESSON_TYPE_MAP[value]
    : value;
}

/** Returns a copy of a stored course (or snapshot) with legacy lesson types mapped to current ones. */
export function normalizeLegacyCourse<T extends { modules?: Array<{ lessons?: Array<{ type?: unknown }> }> }>(course: T): T {
  if (!Array.isArray(course.modules)) return course;
  return {
    ...course,
    modules: course.modules.map((module) => ({
      ...module,
      lessons: Array.isArray(module.lessons)
        ? module.lessons.map((lesson) => ({ ...lesson, type: normalizeLessonType(lesson.type) }))
        : module.lessons,
    })),
  };
}

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens');

const singleLine = (minimum: number, maximum: number) =>
  z.string().trim().min(minimum).max(maximum).transform(cleanSingleLine);

const multiline = (minimum: number, maximum: number) =>
  z.string().trim().min(minimum).max(maximum).transform(cleanMultiline);

export const transcriptCueSchema = z
  .object({
    startSeconds: z.number().int().min(0).max(86_400),
    endSeconds: z.number().int().min(1).max(86_400).optional(),
    text: multiline(1, 2_000),
  })
  .superRefine((cue, context) => {
    if (cue.endSeconds !== undefined && cue.endSeconds <= cue.startSeconds) {
      context.addIssue({ code: 'custom', path: ['endSeconds'], message: 'End time must be after start time' });
    }
  });

export const quizQuestionSchema = z
  .object({
    key: slugSchema,
    prompt: multiline(5, 1_000),
    options: z.array(singleLine(1, 300)).min(2).max(6),
    correctOption: z.number().int().min(0).max(5),
    explanation: multiline(5, 2_000),
  })
  .superRefine((question, context) => {
    if (question.correctOption >= question.options.length) {
      context.addIssue({ code: 'custom', path: ['correctOption'], message: 'Correct option is outside the available choices' });
    }
  });

export const courseLessonSchema = z.object({
  key: slugSchema,
  slug: slugSchema,
  title: singleLine(3, 160),
  summary: multiline(10, 600),
  type: z.preprocess(normalizeLessonType, z.enum(CONCEPT_LESSON_TYPES)),
  youtubeVideoId: z
    .string()
    .trim()
    .optional()
    .transform((value, context) => {
      if (!value) return '';
      const id = extractYouTubeVideoId(value);
      if (!id) {
        context.addIssue({ code: 'custom', message: 'Enter a valid YouTube URL or 11-character video ID' });
        return z.NEVER;
      }
      return id;
    })
    .default(''),
  durationMinutes: z.number().int().min(1).max(480),
  learningObjectives: z.array(singleLine(3, 240)).min(1).max(12),
  concepts: z.array(singleLine(2, 80)).min(1).max(20),
  simulation: z.unknown().optional(),
  transcript: z.array(transcriptCueSchema).max(2_000).default([]),
  studyGuide: z.object({
    mentalModel: z.string().trim().max(4_000).transform(cleanMultiline).default(''),
    keyIdeas: z.array(multiline(1, 500)).max(20).default([]),
    misconceptions: z.array(multiline(1, 500)).max(12).default([]),
    recallPrompts: z.array(multiline(1, 500)).max(12).default([]),
    explainBackPrompt: z.string().trim().max(1_000).transform(cleanMultiline).default(''),
  }).default({ mentalModel: '', keyIdeas: [], misconceptions: [], recallPrompts: [], explainBackPrompt: '' }),
  quiz: z.array(quizQuestionSchema).max(30).default([]),
  published: z.boolean().default(true),
});

export const courseModuleSchema = z.object({
  key: slugSchema,
  title: singleLine(3, 160),
  description: z.string().trim().max(1_000).transform(cleanMultiline).default(''),
  lessons: z.array(courseLessonSchema).min(1).max(40),
});

export const courseInputSchema = z
  .object({
    title: singleLine(3, 160),
    slug: slugSchema,
    eyebrow: singleLine(2, 80).default('AIML learning path'),
    summary: multiline(20, 500),
    description: multiline(40, 12_000),
    topic: z.enum(AIML_TOPICS),
    level: z.enum(COURSE_LEVELS),
    coverImage: optionalAssetUrlSchema,
    tags: z.array(singleLine(2, 60)).min(1).max(12),
    prerequisites: z.array(singleLine(3, 240)).max(12).default([]),
    learningOutcomes: z.array(singleLine(5, 300)).min(2).max(16),
    audience: z.array(singleLine(3, 240)).min(1).max(12),
    instructorName: singleLine(2, 100),
    featured: z.boolean().default(false),
    status: z.enum(['draft', 'published', 'archived']).default('draft'),
    modules: z.array(courseModuleSchema).min(1).max(20),
  })
  .superRefine((course, context) => {
    const moduleKeys = new Set<string>();
    const lessonKeys = new Set<string>();
    const lessonSlugs = new Set<string>();

    course.modules.forEach((module, moduleIndex) => {
      if (moduleKeys.has(module.key)) {
        context.addIssue({ code: 'custom', path: ['modules', moduleIndex, 'key'], message: 'Module keys must be unique' });
      }
      moduleKeys.add(module.key);

      module.lessons.forEach((lesson, lessonIndex) => {
        if (lessonKeys.has(lesson.key)) {
          context.addIssue({ code: 'custom', path: ['modules', moduleIndex, 'lessons', lessonIndex, 'key'], message: 'Lesson keys must be unique' });
        }
        if (lessonSlugs.has(lesson.slug)) {
          context.addIssue({ code: 'custom', path: ['modules', moduleIndex, 'lessons', lessonIndex, 'slug'], message: 'Lesson slugs must be unique' });
        }
        lessonKeys.add(lesson.key);
        lessonSlugs.add(lesson.slug);

        let previousStart = -1;
        lesson.transcript.forEach((cue, cueIndex) => {
          if (cue.startSeconds < previousStart) {
            context.addIssue({ code: 'custom', path: ['modules', moduleIndex, 'lessons', lessonIndex, 'transcript', cueIndex], message: 'Transcript cues must be ordered by start time' });
          }
          previousStart = cue.startSeconds;
        });
      });
    });
  });

export type CourseInput = z.infer<typeof courseInputSchema>;

export const quizSubmissionSchema = z.object({
  answers: z.array(z.object({ questionKey: slugSchema, selectedOption: z.number().int().min(0).max(5) })).min(1).max(30),
});
