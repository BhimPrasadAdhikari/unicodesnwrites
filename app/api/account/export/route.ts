import { NextResponse } from 'next/server';

import { LearnerAccessError, requireAuthenticatedSession } from '@/lib/auth/learner';
import { connectDB } from '@/lib/db/connection';
import CourseEnrollment from '@/lib/models/CourseEnrollment';
import Purchase from '@/lib/models/Purchase';
import Review from '@/lib/models/Review';
import Comment from '@/lib/models/Comment';
import Subscriber from '@/lib/models/Subscriber';
import { User } from '@/lib/models/User';
import LearnerLessonState from '@/lib/models/LearnerLessonState';
import CourseQuizAttempt from '@/lib/models/CourseQuizAttempt';
import LearnerNotebookEntry from '@/lib/models/LearnerNotebookEntry';

export async function GET() {
  try {
    const session = await requireAuthenticatedSession();
    await connectDB();
    const user = await User.findById(session.user.id).select('name email role emailVerified createdAt updatedAt').lean();
    if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });

    const [enrollments, lessonStates, quizAttempts, notebook, purchases, reviews, newsletter, comments] = await Promise.all([
      CourseEnrollment.find({ user: user._id }).select('course status completedLessonSlugs lastLessonSlug enrolledAt lastAccessedAt completedAt createdAt updatedAt').populate('course', 'title slug').lean(),
      LearnerLessonState.find({ user: user._id }).select('course lessonSlug notes activeTab videoPositionSeconds lastAccessedAt createdAt updatedAt').populate('course', 'title slug').lean(),
      CourseQuizAttempt.find({ user: user._id }).select('course lessonSlug answers results score passed correctCount total attemptedAt createdAt').populate('course', 'title slug').sort({ attemptedAt: -1 }).lean(),
      LearnerNotebookEntry.find({ user: user._id }).select('courseTitle courseSlug lessonTitle lessonSlug focus title explanation evidence checkYourself createdAt updatedAt').sort({ createdAt: -1 }).lean(),
      Purchase.find({ customerEmail: user.email }).select('purchaseId product amount currency status downloadCount maxDownloads purchasedAt refundedAt createdAt updatedAt').populate('product', 'title slug').sort({ purchasedAt: -1 }).lean(),
      Review.find({ customerEmail: user.email, emailConfirmed: { $ne: false } }).select('product customerName rating comment verified approved createdAt updatedAt').populate('product', 'title slug').sort({ createdAt: -1 }).lean(),
      Subscriber.findOne({ email: user.email }).select('email name status subscribedAt confirmedAt preferences createdAt updatedAt').lean(),
      Comment.find({ user: user._id }).select('post body approved createdAt updatedAt').populate('post', 'title slug').sort({ createdAt: -1 }).lean(),
    ]);

    const body = JSON.stringify({ exportedAt: new Date().toISOString(), account: user, learning: { enrollments, lessonStates, quizAttempts, notebook }, purchases, reviews, comments, newsletter }, null, 2);
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="unicodesnwrites-account-${new Date().toISOString().slice(0, 10)}.json"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    if (error instanceof LearnerAccessError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    console.error('Account export failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Account export is temporarily unavailable.' }, { status: 500 });
  }
}
