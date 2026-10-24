import { connectDB } from '@/lib/db/connection';
import CourseEnrollment from '@/lib/models/CourseEnrollment';
import CourseQuizAttempt from '@/lib/models/CourseQuizAttempt';
import LearnerLessonState, { type LessonWorkspaceTab } from '@/lib/models/LearnerLessonState';
import LearnerNotebookEntry from '@/lib/models/LearnerNotebookEntry';

type QuizResult = {
  score: number;
  passed: boolean;
  correctCount: number;
  total: number;
  results: Array<{ questionKey: string; correct: boolean; selectedOption: number | null; correctOption: number; explanation: string }>;
};

type NotebookLesson = {
  course: { id: string; title: string; slug: string };
  lesson: { title: string; slug: string };
};

type AiNote = { title: string; explanation: string; evidence: string[]; checkYourself: string };

export async function getLessonPersistence(userId: string, courseId: string, lessonSlug: string) {
  await connectDB();
  const [state, attempts, attemptCount] = await Promise.all([
    LearnerLessonState.findOne({ user: userId, course: courseId, lessonSlug }).lean(),
    CourseQuizAttempt.find({ user: userId, course: courseId, lessonSlug }).sort({ attemptedAt: -1 }).limit(5).lean(),
    CourseQuizAttempt.countDocuments({ user: userId, course: courseId, lessonSlug }),
  ]);

  return {
    notes: state?.notes || '',
    activeTab: (state?.activeTab || 'transcript') as LessonWorkspaceTab,
    videoPositionSeconds: state?.videoPositionSeconds || 0,
    lastSavedAt: state?.updatedAt?.toISOString() || null,
    quizAttempts: attempts.map((attempt) => ({
      id: attempt._id.toString(),
      score: attempt.score,
      passed: attempt.passed,
      correctCount: attempt.correctCount,
      total: attempt.total,
      answers: attempt.answers,
      results: attempt.results,
      attemptedAt: attempt.attemptedAt.toISOString(),
    })),
    quizAttemptCount: attemptCount,
  };
}

export async function saveLessonState(input: {
  userId: string;
  courseId: string;
  lessonSlug: string;
  role: string;
  patch: { notes?: string; activeTab?: LessonWorkspaceTab; videoPositionSeconds?: number };
}) {
  await connectDB();
  const now = new Date();
  const state = await LearnerLessonState.findOneAndUpdate(
    { user: input.userId, course: input.courseId, lessonSlug: input.lessonSlug },
    { $set: { ...input.patch, lastAccessedAt: now } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  ).lean();

  if (input.role !== 'admin') {
    await CourseEnrollment.updateOne(
      { user: input.userId, course: input.courseId },
      { $set: { lastLessonSlug: input.lessonSlug, lastAccessedAt: now } }
    );
  }
  return { savedAt: state?.updatedAt?.toISOString() || now.toISOString() };
}

export async function recordQuizAttempt(input: {
  userId: string;
  courseId: string;
  lessonSlug: string;
  answers: Array<{ questionKey: string; selectedOption: number }>;
  result: QuizResult;
}) {
  await connectDB();
  const attempt = await CourseQuizAttempt.create({
    user: input.userId,
    course: input.courseId,
    lessonSlug: input.lessonSlug,
    answers: input.answers,
    ...input.result,
    attemptedAt: new Date(),
  });
  return { attemptId: attempt._id.toString(), attemptedAt: attempt.attemptedAt.toISOString() };
}

export async function saveAiNotebookEntry(userId: string, workspace: NotebookLesson, focus: string, note: AiNote) {
  await connectDB();
  const entry = await LearnerNotebookEntry.create({
    user: userId,
    course: workspace.course.id,
    courseTitle: workspace.course.title,
    courseSlug: workspace.course.slug,
    lessonTitle: workspace.lesson.title,
    lessonSlug: workspace.lesson.slug,
    focus,
    ...note,
  });
  return { notebookEntryId: entry._id.toString(), savedAt: entry.createdAt.toISOString() };
}

export async function listNotebookEntries(userId: string) {
  await connectDB();
  const entries = await LearnerNotebookEntry.find({ user: userId }).sort({ createdAt: -1 }).limit(250).lean();
  return entries.map((entry) => ({
    id: entry._id.toString(),
    courseTitle: entry.courseTitle,
    courseSlug: entry.courseSlug,
    lessonTitle: entry.lessonTitle,
    lessonSlug: entry.lessonSlug,
    focus: entry.focus,
    title: entry.title,
    explanation: entry.explanation,
    evidence: entry.evidence,
    checkYourself: entry.checkYourself,
    createdAt: entry.createdAt.toISOString(),
  }));
}
