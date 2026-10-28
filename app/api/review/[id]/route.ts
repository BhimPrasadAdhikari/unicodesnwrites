import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

import { LearnerAccessError, requireVerifiedSession } from '@/lib/auth/learner';
import { gradeReviewCard, normalizeTimeZone } from '@/lib/services/review-queue';
import { reviewAnswerSchema } from '@/lib/utils/validations/learner';

type RouteContext = { params: Promise<{ id: string }> };

const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest, { params }: RouteContext) {
  let session: Awaited<ReturnType<typeof requireVerifiedSession>>;
  try { session = await requireVerifiedSession(); } catch (error) { return error instanceof LearnerAccessError ? NextResponse.json({ error: error.message }, { status: error.statusCode }) : NextResponse.json({ error: 'Unable to authorize review.' }, { status: 500 }); }
  const key = session.user.id;
  const now = Date.now();
  const current = attempts.get(key);
  if (current && current.resetAt > now && current.count >= 60) {
    return NextResponse.json({ error: 'Too many answers at once. Try again shortly.' }, { status: 429 });
  }
  attempts.set(key, current && current.resetAt > now ? { ...current, count: current.count + 1 } : { count: 1, resetAt: now + 60_000 });
  if (attempts.size > 5_000) attempts.clear();

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Review card not found.' }, { status: 404 });
  const body = await request.json().catch(() => null);
  const parsed = reviewAnswerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid review answer', details: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await gradeReviewCard({
      userId: session.user.id,
      role: session.user.role,
      cardId: id,
      selectedOption: parsed.data.selectedOption,
      timeZone: normalizeTimeZone(parsed.data.timeZone),
    });
    switch (result.kind) {
      case 'missing':
        return NextResponse.json({ error: 'Review card not found.' }, { status: 404 });
      case 'unavailable':
        return NextResponse.json({ error: 'This question is no longer available.' }, { status: 404 });
      case 'invalid-option':
        return NextResponse.json({ error: 'Invalid review answer' }, { status: 400 });
      case 'not-due':
        return NextResponse.json({ error: 'This card isn’t due yet.', nextDueAt: result.nextDueAt }, { status: 409 });
      default:
        return NextResponse.json({
          correct: result.correct,
          correctOption: result.correctOption,
          explanation: result.explanation,
          box: result.box,
          nextDueAt: result.nextDueAt,
          streak: result.streak,
        }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
  } catch (error) {
    console.error('Review grading failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Your answer couldn’t be checked just now. Try again.' }, { status: 503 });
  }
}
