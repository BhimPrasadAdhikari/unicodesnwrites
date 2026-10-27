import { connectDB } from '@/lib/db/connection';
import Course from '@/lib/models/Course';
import CourseEnrollment from '@/lib/models/CourseEnrollment';
import CourseQuizAttempt from '@/lib/models/CourseQuizAttempt';
import LearnerLessonState from '@/lib/models/LearnerLessonState';
import LearnerNotebookEntry from '@/lib/models/LearnerNotebookEntry';

export async function getEnrollment(userId: string, courseSlug: string) {
  await connectDB();
  const course = await Course.findOne({ slug: courseSlug, status: 'published' }).select('_id modules.lessons.slug modules.lessons.published').lean();
  if (!course) return { course: null, enrollment: null, lessonSlugs: [] as string[] };
  const enrollment = await CourseEnrollment.findOne({ user: userId, course: course._id }).lean();
  const lessonSlugs = course.modules.flatMap((module) => module.lessons).filter((lesson) => lesson.published).map((lesson) => lesson.slug);
  return { course, enrollment, lessonSlugs };
}

export async function enrollInCourse(userId: string, courseSlug: string) {
  await connectDB();
  const course = await Course.findOne({ slug: courseSlug, status: 'published' }).select('_id').lean();
  if (!course) return null;
  return CourseEnrollment.findOneAndUpdate(
    { user: userId, course: course._id },
    { $setOnInsert: { status: 'active', enrolledAt: new Date(), completedLessonSlugs: [] }, $set: { lastAccessedAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
}

export async function updateCourseProgress(userId: string, courseSlug: string, lessonSlug: string, completed: boolean, options: { autoEnroll?: boolean } = {}) {
  const initial = await getEnrollment(userId, courseSlug);
  if (!initial.course) return { kind: 'missing' as const };
  // Check the lesson before any write, so a bad slug can't create an enrollment.
  if (!initial.lessonSlugs.includes(lessonSlug)) return { kind: 'invalid-lesson' as const };

  let enrollmentId: string;
  if (initial.enrollment) {
    enrollmentId = String(initial.enrollment._id);
  } else {
    if (options.autoEnroll === false) return { kind: 'not-enrolled' as const };
    const created = await enrollInCourse(userId, courseSlug);
    if (!created) return { kind: 'not-enrolled' as const };
    enrollmentId = String(created._id);
  }

  const update = completed ? { $addToSet: { completedLessonSlugs: lessonSlug } } : { $pull: { completedLessonSlugs: lessonSlug } };
  await CourseEnrollment.updateOne({ _id: enrollmentId }, { ...update, $set: { lastAccessedAt: new Date(), lastLessonSlug: lessonSlug } });
  const refreshed = await CourseEnrollment.findById(enrollmentId).lean();
  if (!refreshed) return { kind: 'missing' as const };
  const allComplete = initial.lessonSlugs.length > 0 && initial.lessonSlugs.every((slug) => refreshed.completedLessonSlugs.includes(slug));
  if ((allComplete && refreshed.status !== 'completed') || (!allComplete && refreshed.status === 'completed')) {
    const nextStatus = allComplete ? 'completed' : 'active';
    const nextCompletedAt = allComplete ? new Date() : null;
    await CourseEnrollment.updateOne({ _id: refreshed._id }, { $set: { status: nextStatus, completedAt: nextCompletedAt } });
    return { kind: 'ok' as const, completedLessonSlugs: refreshed.completedLessonSlugs, status: nextStatus };
  }
  return { kind: 'ok' as const, completedLessonSlugs: refreshed.completedLessonSlugs, status: refreshed.status };
}

export async function listLearnerEnrollments(userId: string) {
  await connectDB();
  const enrollments = await CourseEnrollment.find({ user: userId }).sort({ lastAccessedAt: -1 }).populate({ path: 'course', match: { status: 'published' }, select: 'title slug summary level topic coverImage modules' }).lean();
  return enrollments.flatMap((item) => {
    const course = item.course as unknown as { _id: { toString(): string }; title: string; slug: string; summary: string; level: string; topic: string; modules: Array<{ lessons: Array<{ slug: string; published: boolean }> }> } | null;
    if (!course) return [];
    const lessonSlugs = course.modules.flatMap((module) => module.lessons).filter((lesson) => lesson.published).map((lesson) => lesson.slug);
    const completed = item.completedLessonSlugs.filter((slug) => lessonSlugs.includes(slug)).length;
    const firstIncompleteLesson = lessonSlugs.find((slug) => !item.completedLessonSlugs.includes(slug)) || lessonSlugs[0] || null;
    const resumeLesson = item.lastLessonSlug && lessonSlugs.includes(item.lastLessonSlug) ? item.lastLessonSlug : firstIncompleteLesson;
    return [{ id: item._id.toString(), title: course.title, slug: course.slug, summary: course.summary, level: course.level, topic: course.topic, status: item.status, completed, total: lessonSlugs.length, progress: lessonSlugs.length ? Math.round(completed / lessonSlugs.length * 100) : 0, firstIncompleteLesson, resumeLesson, lastAccessedAt: item.lastAccessedAt.toISOString() }];
  });
}

export async function getAdminEnrollmentOverview() {
  await connectDB();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [total, activeLearnerIds, completed, activeLast7Days, recent, byCourse, quizSummaryRows, lessonActivity, notebookEntries, learnersWithNotes] = await Promise.all([
    CourseEnrollment.countDocuments(), CourseEnrollment.distinct('user', { status: 'active' }), CourseEnrollment.countDocuments({ status: 'completed' }), CourseEnrollment.countDocuments({ lastAccessedAt: { $gte: sevenDaysAgo } }),
    CourseEnrollment.find().sort({ enrolledAt: -1 }).limit(25).populate('user', 'name email').populate('course', 'title slug').lean(),
    CourseEnrollment.aggregate([{ $group: { _id: '$course', enrollments: { $sum: 1 }, completions: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } }, { $sort: { enrollments: -1 } }, { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'course' } }, { $unwind: '$course' }, { $project: { title: '$course.title', slug: '$course.slug', enrollments: 1, completions: 1 } }]),
    CourseQuizAttempt.aggregate([{ $group: { _id: null, attempts: { $sum: 1 }, averageScore: { $avg: '$score' }, passed: { $sum: { $cond: ['$passed', 1, 0] } } } }]),
    LearnerLessonState.aggregate([
      { $group: { _id: { course: '$course', lessonSlug: '$lessonSlug' }, learners: { $addToSet: '$user' }, noteAuthors: { $addToSet: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$notes', ''] } }, 0] }, '$user', null] } }, lastAccessedAt: { $max: '$lastAccessedAt' } } },
      { $project: { course: '$_id.course', lessonSlug: '$_id.lessonSlug', learners: { $size: '$learners' }, noteAuthors: { $size: { $setDifference: ['$noteAuthors', [null]] } }, lastAccessedAt: 1 } },
      { $sort: { learners: -1, lastAccessedAt: -1 } }, { $limit: 15 },
      { $lookup: { from: 'courses', localField: 'course', foreignField: '_id', as: 'courseRecord' } },
      { $unwind: '$courseRecord' },
      { $project: { courseTitle: '$courseRecord.title', courseSlug: '$courseRecord.slug', lessonSlug: 1, learners: 1, noteAuthors: 1, lastAccessedAt: 1 } },
    ]),
    LearnerNotebookEntry.countDocuments(),
    LearnerLessonState.distinct('user', { notes: { $type: 'string', $ne: '' } }),
  ]);
  // Per-learner metrics only for the rows on screen, not every learner on the platform.
  const recentScope = {
    user: { $in: recent.map((item) => item.user?._id || item.user).filter(Boolean) },
    course: { $in: recent.map((item) => item.course?._id || item.course).filter(Boolean) },
  };
  const [learnerQuizRows, learnerStateRows] = await Promise.all([
    CourseQuizAttempt.aggregate([{ $match: recentScope }, { $group: { _id: { user: '$user', course: '$course' }, attempts: { $sum: 1 }, averageScore: { $avg: '$score' }, passed: { $sum: { $cond: ['$passed', 1, 0] } } } }]),
    LearnerLessonState.aggregate([{ $match: recentScope }, { $group: { _id: { user: '$user', course: '$course' }, lessonsVisited: { $sum: 1 }, notesCount: { $sum: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$notes', ''] } }, 0] }, 1, 0] } }, lastStudyAt: { $max: '$lastAccessedAt' } } }]),
  ]);
  const quizSummary = quizSummaryRows[0] || { attempts: 0, averageScore: 0, passed: 0 };
  const keyFor = (user: unknown, course: unknown) => `${String(user)}:${String(course)}`;
  const quizByLearner = new Map(learnerQuizRows.map((row) => [keyFor(row._id.user, row._id.course), row]));
  const stateByLearner = new Map(learnerStateRows.map((row) => [keyFor(row._id.user, row._id.course), row]));
  const recentWithMetrics = recent.map((item) => {
    const key = keyFor(item.user?._id || item.user, item.course?._id || item.course);
    const quiz = quizByLearner.get(key);
    const state = stateByLearner.get(key);
    return {
      ...item,
      metrics: {
        quizAttempts: quiz?.attempts || 0,
        averageQuizScore: quiz?.averageScore ? Math.round(quiz.averageScore) : null,
        lessonsVisited: state?.lessonsVisited || 0,
        notesCount: state?.notesCount || 0,
        lastStudyAt: state?.lastStudyAt || item.lastAccessedAt,
      },
    };
  });
  return {
    total,
    active: activeLearnerIds.length,
    completed,
    activeLast7Days,
    recent: recentWithMetrics,
    byCourse,
    quiz: {
      attempts: quizSummary.attempts,
      averageScore: quizSummary.attempts ? Math.round(quizSummary.averageScore) : 0,
      passRate: quizSummary.attempts ? Math.round((quizSummary.passed / quizSummary.attempts) * 100) : 0,
    },
    notebookEntries,
    learnersWithNotes: learnersWithNotes.length,
    lessonActivity,
  };
}
