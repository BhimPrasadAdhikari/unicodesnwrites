import mongoose from 'mongoose';

import { connectDB } from '@/lib/db/connection';
import Course, { ICourseLesson, ICourseModule } from '@/lib/models/Course';
import { getYouTubeEmbedUrl } from '@/lib/utils/youtube';

type CourseRecord = {
  _id: { toString(): string };
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
  publishedAt?: Date;
};

// Long per-lesson content that outline pages never need.
const OUTLINE_EXCLUDE = {
  'modules.lessons.article': 0,
  'modules.lessons.codeWalkthrough': 0,
  'modules.lessons.exercises': 0,
  'modules.lessons.transcript': 0,
  'modules.lessons.studyGuide': 0,
};

/**
 * Loads a course with full content for one lesson only; every other lesson keeps just
 * what the curriculum sidebar and navigation need. Rich courses can be several hundred
 * kilobytes, so this avoids reading all of it on every lesson view.
 */
async function findCourseForLesson(match: Record<string, unknown>, lessonSlug: string) {
  const [course] = await Course.aggregate([
    { $match: match },
    {
      $set: {
        modules: {
          $map: {
            input: '$modules',
            as: 'module',
            in: {
              $mergeObjects: [
                '$$module',
                {
                  lessons: {
                    $map: {
                      input: '$$module.lessons',
                      as: 'lesson',
                      in: {
                        $cond: [
                          { $eq: ['$$lesson.slug', lessonSlug] },
                          '$$lesson',
                          {
                            key: '$$lesson.key',
                            slug: '$$lesson.slug',
                            title: '$$lesson.title',
                            durationMinutes: '$$lesson.durationMinutes',
                            published: '$$lesson.published',
                            quiz: [],
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    },
    { $limit: 1 },
  ]);
  return (course || null) as CourseRecord | null;
}

export function getCourseStats(modules: ICourseModule[]) {
  const lessons = modules.flatMap((module) => module.lessons).filter((lesson) => lesson.published);
  return {
    lessonCount: lessons.length,
    durationMinutes: lessons.reduce((total, lesson) => total + lesson.durationMinutes, 0),
    quizCount: lessons.reduce((total, lesson) => total + lesson.quiz.length, 0),
  };
}

function toCourseCard(course: CourseRecord) {
  return {
    id: course._id.toString(),
    title: course.title,
    slug: course.slug,
    eyebrow: course.eyebrow,
    summary: course.summary,
    topic: course.topic,
    level: course.level,
    coverImage: course.coverImage || '',
    tags: course.tags,
    instructorName: course.instructorName,
    featured: course.featured,
    publishedAt: course.publishedAt?.toISOString() || null,
    ...getCourseStats(course.modules),
  };
}

export async function listPublishedCourses(filters?: { topic?: string; level?: string; limit?: number }) {
  await connectDB();
  const query: Record<string, unknown> = { status: 'published' };
  if (filters?.topic) query.topic = filters.topic;
  if (filters?.level) query.level = filters.level;

  const courseQuery = Course.find(query)
    .select('title slug eyebrow summary topic level coverImage tags instructorName featured publishedAt modules.lessons.published modules.lessons.durationMinutes modules.lessons.quiz.key')
    .sort({ featured: -1, publishedAt: -1, createdAt: -1 })
    .lean();
  if (filters?.limit) courseQuery.limit(Math.min(filters.limit, 24));
  const courses = (await courseQuery) as unknown as CourseRecord[];

  return courses.map(toCourseCard);
}

export async function getPublishedCourseBySlug(slug: string) {
  await connectDB();
  const course = (await Course.findOne({ slug, status: 'published' }, OUTLINE_EXCLUDE).lean()) as unknown as CourseRecord | null;
  if (!course) return null;

  const modules = course.modules.map((module) => ({
    key: module.key,
    title: module.title,
    description: module.description,
    lessons: module.lessons
      .filter((lesson) => lesson.published)
      .map((lesson) => ({
        key: lesson.key,
        slug: lesson.slug,
        title: lesson.title,
        summary: lesson.summary,
        type: lesson.type,
        durationMinutes: lesson.durationMinutes,
        concepts: lesson.concepts,
      })),
  }));

  return {
    ...toCourseCard(course),
    description: course.description,
    prerequisites: course.prerequisites,
    learningOutcomes: course.learningOutcomes,
    audience: course.audience,
    modules,
    firstLessonSlug: modules.flatMap((module) => module.lessons)[0]?.slug || null,
  };
}

export async function getCoursePreviewById(courseId: string) {
  await connectDB();
  const course = (await Course.findById(courseId, OUTLINE_EXCLUDE).lean()) as unknown as CourseRecord | null;
  if (!course) return null;
  const lessons = course.modules.flatMap((module) => module.lessons);
  return {
    id: course._id.toString(),
    title: course.title,
    slug: course.slug,
    eyebrow: course.eyebrow,
    summary: course.summary,
    description: course.description,
    topic: course.topic,
    level: course.level,
    coverImage: course.coverImage || '',
    tags: course.tags,
    prerequisites: course.prerequisites,
    learningOutcomes: course.learningOutcomes,
    audience: course.audience,
    instructorName: course.instructorName,
    featured: course.featured,
    status: course.status,
    lessonCount: lessons.length,
    durationMinutes: lessons.reduce((total, lesson) => total + lesson.durationMinutes, 0),
    quizCount: lessons.reduce((total, lesson) => total + lesson.quiz.length, 0),
    modules: course.modules.map((module) => ({
      key: module.key,
      title: module.title,
      description: module.description,
      lessons: module.lessons.map((lesson) => ({
        key: lesson.key,
        slug: lesson.slug,
        title: lesson.title,
        summary: lesson.summary,
        type: lesson.type,
        durationMinutes: lesson.durationMinutes,
        concepts: lesson.concepts,
        published: lesson.published,
      })),
    })),
  };
}

export async function getPublishedLessonWorkspace(courseSlug: string, lessonSlug: string) {
  await connectDB();
  const course = await findCourseForLesson({ slug: courseSlug, status: 'published' }, lessonSlug);
  if (!course) return null;
  return buildLessonWorkspace(course, lessonSlug, { includeUnpublished: false });
}

/**
 * Admin-only preview of any lesson in any course status (draft included).
 * Returns the quiz answer key separately so the preview can grade in the browser.
 */
export async function getLessonPreviewById(courseId: string, lessonSlug: string) {
  await connectDB();
  if (!mongoose.isValidObjectId(courseId)) return null;
  const course = await findCourseForLesson({ _id: new mongoose.Types.ObjectId(courseId) }, lessonSlug);
  if (!course) return null;
  const workspace = buildLessonWorkspace(course, lessonSlug, { includeUnpublished: true });
  if (!workspace) return null;
  const lesson = course.modules.flatMap((module) => module.lessons).find((item) => item.slug === lessonSlug);
  const answerKey = Object.fromEntries(
    (lesson?.quiz || []).map((question) => [question.key, { correctOption: question.correctOption, explanation: question.explanation }])
  );
  return { workspace, answerKey, status: course.status };
}

function buildLessonWorkspace(course: CourseRecord, lessonSlug: string, { includeUnpublished }: { includeUnpublished: boolean }) {
  const visible = (lesson: ICourseLesson) => includeUnpublished || lesson.published;
  const orderedLessons: Array<ICourseLesson & { moduleKey: string; moduleTitle: string }> = [];
  course.modules.forEach((module) => {
    module.lessons.filter(visible).forEach((lesson) => {
      orderedLessons.push({ ...lesson, moduleKey: module.key, moduleTitle: module.title });
    });
  });

  const lessonIndex = orderedLessons.findIndex((lesson) => lesson.slug === lessonSlug);
  if (lessonIndex < 0) return null;
  const lesson = orderedLessons[lessonIndex];

  return {
    course: {
      id: course._id.toString(),
      title: course.title,
      slug: course.slug,
      level: course.level,
      topic: course.topic,
      instructorName: course.instructorName,
    },
    lesson: {
      key: lesson.key,
      slug: lesson.slug,
      title: lesson.title,
      summary: lesson.summary,
      type: lesson.type,
      moduleKey: lesson.moduleKey,
      moduleTitle: lesson.moduleTitle,
      durationMinutes: lesson.durationMinutes,
      embedUrl: lesson.videoUrl ? '' : getYouTubeEmbedUrl(lesson.youtubeVideoId),
      videoUrl: lesson.videoUrl || '',
      videoPosterUrl: lesson.videoPosterUrl || '',
      learningObjectives: lesson.learningObjectives,
      concepts: lesson.concepts,
      visualization: lesson.visualization,
      simulation: lesson.simulation,
      interactive: lesson.interactive?.component ? lesson.interactive : null,
      article: lesson.article || '',
      codeWalkthrough: lesson.codeWalkthrough || null,
      resources: lesson.resources || [],
      exercises: lesson.exercises || [],
      transcript: lesson.transcript,
      studyGuide: lesson.studyGuide,
      quiz: lesson.quiz.map((question) => ({
        key: question.key,
        prompt: question.prompt,
        options: question.options,
      })),
    },
    curriculum: course.modules.map((module) => ({
      key: module.key,
      title: module.title,
      lessons: module.lessons.filter(visible).map((item) => ({
        key: item.key,
        slug: item.slug,
        title: item.title,
        durationMinutes: item.durationMinutes,
      })),
    })),
    navigation: {
      previous: lessonIndex > 0 ? { slug: orderedLessons[lessonIndex - 1].slug, title: orderedLessons[lessonIndex - 1].title } : null,
      next: lessonIndex < orderedLessons.length - 1 ? { slug: orderedLessons[lessonIndex + 1].slug, title: orderedLessons[lessonIndex + 1].title } : null,
    },
    lessonNumber: lessonIndex + 1,
    lessonCount: orderedLessons.length,
  };
}

export async function gradePublishedLessonQuiz(
  courseSlug: string,
  lessonSlug: string,
  answers: Array<{ questionKey: string; selectedOption: number }>
) {
  await connectDB();
  const course = (await Course.findOne({ slug: courseSlug, status: 'published' }).lean()) as unknown as CourseRecord | null;
  if (!course) return null;

  const lesson = course.modules.flatMap((module) => module.lessons).find((item) => item.slug === lessonSlug && item.published);
  if (!lesson) return null;

  const answerMap = new Map(answers.map((answer) => [answer.questionKey, answer.selectedOption]));
  const results = lesson.quiz.map((question) => {
    const selectedOption = answerMap.get(question.key);
    return {
      questionKey: question.key,
      correct: selectedOption === question.correctOption,
      selectedOption: selectedOption ?? null,
      correctOption: question.correctOption,
      explanation: question.explanation,
    };
  });
  const correctCount = results.filter((result) => result.correct).length;

  return {
    courseId: course._id.toString(),
    correctCount,
    total: results.length,
    score: results.length ? Math.round((correctCount / results.length) * 100) : 0,
    passed: results.length > 0 && correctCount / results.length >= 0.7,
    results,
  };
}

export type LessonWorkspaceDTO = NonNullable<Awaited<ReturnType<typeof getPublishedLessonWorkspace>>>;
