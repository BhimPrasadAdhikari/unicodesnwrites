import { connectDB } from '@/lib/db/connection';
import Course, { type IQuizQuestion } from '@/lib/models/Course';
import CourseEnrollment from '@/lib/models/CourseEnrollment';
import ReviewCard from '@/lib/models/ReviewCard';
import ReviewStreak from '@/lib/models/ReviewStreak';

// Leitner-style boxes: a right answer moves the card up one box, a wrong one sends it back to 0.
export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 16, 35] as const;
export const REVIEW_SESSION_LIMIT = 20;
// Upper bound on due cards inspected per request, so a long backlog stays cheap to count.
const DUE_SCAN_LIMIT = 500;
const DAY_MS = 86_400_000;

type MissedQuestion = { questionKey: string; correct: boolean; selectedOption: number | null };

type ReviewCourse = {
  _id: { toString(): string };
  title: string;
  slug: string;
  modules: Array<{ lessons: Array<{ slug: string; title: string; published: boolean; quiz: IQuizQuestion[] }> }>;
};

type ResolvedQuestion = {
  course: { title: string; slug: string };
  lesson: { title: string; slug: string };
  question: IQuizQuestion;
};

export function nextReviewSchedule(box: number, correct: boolean, now: Date) {
  if (!correct) return { box: 0, intervalDays: 1, dueAt: new Date(now.getTime() + DAY_MS) };
  const nextBox = Math.min(box + 1, REVIEW_INTERVAL_DAYS.length);
  const intervalDays = REVIEW_INTERVAL_DAYS[nextBox - 1];
  return { box: nextBox, intervalDays, dueAt: new Date(now.getTime() + intervalDays * DAY_MS) };
}

/** An IANA zone from the browser, or UTC when it is missing or unknown to this runtime. */
export function normalizeTimeZone(value: unknown) {
  if (typeof value !== 'string' || !value || value.length > 64) return 'UTC';
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

function dayInZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function previousDay(day: string) {
  return new Date(Date.parse(`${day}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
}

function streakView(
  streak: { currentStreak: number; longestStreak: number; lastReviewDay: string; timeZone: string } | null,
  now: Date,
  timeZone?: string
) {
  if (!streak) return { current: 0, longest: 0, reviewedToday: false, timeZone: timeZone || 'UTC' };
  const zone = timeZone || streak.timeZone || 'UTC';
  const today = dayInZone(now, zone);
  // A streak is still alive until the learner lets a whole local day pass without a review.
  const alive = streak.lastReviewDay === today || streak.lastReviewDay === previousDay(today);
  return {
    current: alive ? streak.currentStreak : 0,
    longest: streak.longestStreak,
    reviewedToday: streak.lastReviewDay >= today,
    timeZone: zone,
  };
}

export type ReviewStreakDTO = ReturnType<typeof streakView>;

async function recordReviewDay(userId: string, timeZone: string, now: Date) {
  const today = dayInZone(now, timeZone);
  const existing = await ReviewStreak.findOne({ user: userId }).lean();
  // Same day, or a zone change that puts "today" behind the last recorded day: nothing to add.
  if (existing && existing.lastReviewDay >= today) return streakView(existing, now, timeZone);

  const currentStreak = existing?.lastReviewDay === previousDay(today) ? existing.currentStreak + 1 : 1;
  const next = {
    currentStreak,
    longestStreak: Math.max(existing?.longestStreak || 0, currentStreak),
    lastReviewDay: today,
    timeZone,
  };
  if (existing) {
    // Conditional on the day we read, so two tabs answering at once can't double-count.
    await ReviewStreak.updateOne({ _id: existing._id, lastReviewDay: existing.lastReviewDay }, { $set: next });
  } else {
    await ReviewStreak.updateOne({ user: userId }, { $setOnInsert: next }, { upsert: true });
  }
  return streakView(next, now, timeZone);
}

/** Turns wrong quiz answers into cards that are due straight away. Unanswered questions are skipped. */
export async function upsertCardsForMissedQuestions(input: {
  userId: string;
  courseId: string;
  lessonSlug: string;
  results: MissedQuestion[];
  now?: Date;
}) {
  const missed = input.results.filter((result) => !result.correct && result.selectedOption !== null);
  if (!missed.length) return 0;
  await connectDB();
  const now = input.now || new Date();
  await ReviewCard.bulkWrite(
    missed.map((result) => ({
      updateOne: {
        filter: { user: input.userId, course: input.courseId, lessonSlug: input.lessonSlug, questionKey: result.questionKey },
        update: {
          $set: { box: 0, intervalDays: 0, dueAt: now },
          $setOnInsert: { lapses: 0, reviewCount: 0 },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );
  return missed.length;
}

// Question content always comes from the published course: drafts, archived courses,
// unpublished lessons and deleted questions simply drop out of the queue.
async function loadQuestionResolver(userId: string, role: string, courseIds: string[]) {
  const [courses, enrollments] = await Promise.all([
    Course.find({ _id: { $in: courseIds }, status: 'published' })
      .select('title slug modules.lessons.slug modules.lessons.title modules.lessons.published modules.lessons.quiz')
      .lean() as unknown as Promise<ReviewCourse[]>,
    role === 'admin' ? Promise.resolve(null) : CourseEnrollment.find({ user: userId, course: { $in: courseIds } }).select('course').lean(),
  ]);
  const enrolled = enrollments ? new Set(enrollments.map((item) => item.course.toString())) : null;
  const byCourse = new Map<string, ReviewCourse>();
  courses.forEach((course) => {
    if (!enrolled || enrolled.has(course._id.toString())) byCourse.set(course._id.toString(), course);
  });

  return (courseId: string, lessonSlug: string, questionKey: string): ResolvedQuestion | null => {
    const course = byCourse.get(courseId);
    if (!course) return null;
    const lesson = course.modules.flatMap((module) => module.lessons).find((item) => item.slug === lessonSlug && item.published);
    const question = lesson?.quiz.find((item) => item.key === questionKey);
    if (!lesson || !question) return null;
    return { course: { title: course.title, slug: course.slug }, lesson: { title: lesson.title, slug: lesson.slug }, question };
  };
}

async function loadReviewableDueCards(userId: string, role: string, now: Date) {
  await connectDB();
  const cards = await ReviewCard.find({ user: userId, dueAt: { $lte: now } })
    .sort({ dueAt: 1, _id: 1 })
    .limit(DUE_SCAN_LIMIT)
    .select('course lessonSlug questionKey box lapses dueAt')
    .lean();
  if (!cards.length) return [];
  const resolve = await loadQuestionResolver(userId, role, [...new Set(cards.map((card) => card.course.toString()))]);
  return cards.flatMap((card) => {
    const resolved = resolve(card.course.toString(), card.lessonSlug, card.questionKey);
    return resolved ? [{ card, ...resolved }] : [];
  });
}

export async function countDueReviews(userId: string, role: string) {
  return (await loadReviewableDueCards(userId, role, new Date())).length;
}

export async function listDueReviews(userId: string, role: string, timeZone?: string) {
  const now = new Date();
  const [due, streak] = await Promise.all([
    loadReviewableDueCards(userId, role, now),
    ReviewStreak.findOne({ user: userId }).lean(),
  ]);
  const upcoming = due.length
    ? null
    : await ReviewCard.findOne({ user: userId, dueAt: { $gt: now } }).sort({ dueAt: 1 }).select('dueAt').lean();

  return {
    dueCount: due.length,
    cards: due.slice(0, REVIEW_SESSION_LIMIT).map(({ card, course, lesson, question }) => ({
      id: card._id.toString(),
      prompt: question.prompt,
      options: question.options,
      course,
      lesson,
      lessonUrl: `/courses/${course.slug}/learn/${lesson.slug}`,
      box: card.box,
      lapses: card.lapses,
    })),
    nextDueAt: upcoming?.dueAt.toISOString() || null,
    streak: streakView(streak, now, timeZone),
  };
}

export type ReviewQueueDTO = Awaited<ReturnType<typeof listDueReviews>>;
export type ReviewCardDTO = ReviewQueueDTO['cards'][number];

export async function gradeReviewCard(input: {
  userId: string;
  role: string;
  cardId: string;
  selectedOption: number;
  timeZone: string;
}) {
  await connectDB();
  const now = new Date();
  const card = await ReviewCard.findOne({ _id: input.cardId, user: input.userId }).lean();
  if (!card) return { kind: 'missing' as const };
  if (card.dueAt > now) return { kind: 'not-due' as const, nextDueAt: card.dueAt.toISOString() };

  const resolve = await loadQuestionResolver(input.userId, input.role, [card.course.toString()]);
  const resolved = resolve(card.course.toString(), card.lessonSlug, card.questionKey);
  if (!resolved) return { kind: 'unavailable' as const };
  const { question } = resolved;
  if (input.selectedOption >= question.options.length) return { kind: 'invalid-option' as const };

  const correct = input.selectedOption === question.correctOption;
  const schedule = nextReviewSchedule(card.box, correct, now);
  // Matching the box and due date we graded against makes a double submit a no-op.
  const updated = await ReviewCard.updateOne(
    { _id: card._id, user: input.userId, box: card.box, dueAt: card.dueAt },
    { $set: { ...schedule, lastReviewedAt: now }, $inc: { reviewCount: 1, lapses: correct ? 0 : 1 } }
  );
  if (!updated.matchedCount) return { kind: 'not-due' as const, nextDueAt: null };

  let streak: ReviewStreakDTO | null = null;
  try {
    streak = await recordReviewDay(input.userId, input.timeZone, now);
  } catch (error) {
    // The answer is already saved; a missed streak write must not turn it into an error.
    console.error('Review streak update failed:', error instanceof Error ? error.message : 'unknown error');
  }

  return {
    kind: 'graded' as const,
    correct,
    correctOption: question.correctOption,
    explanation: question.explanation,
    box: schedule.box,
    nextDueAt: schedule.dueAt.toISOString(),
    streak,
  };
}
