import { NextRequest, NextResponse } from 'next/server';
import { requireAdminResponse } from '@/lib/auth/admin';
import { generateGroundedQuiz } from '@/lib/services/ai-quiz';
import type { ITranscriptCue } from '@/lib/models/Course';

export async function POST(request: NextRequest) {
  try {
    const unauthorized = await requireAdminResponse();
    if (unauthorized) return unauthorized;

    const body = await request.json().catch(() => null);
    const lessonTitle = body?.lessonTitle || 'Lesson';
    const cues: ITranscriptCue[] = body?.cues || [];

    if (!Array.isArray(cues) || !cues.length) {
      return NextResponse.json({ error: 'A transcript is required to generate an AI quiz.' }, { status: 400 });
    }

    const quiz = await generateGroundedQuiz(lessonTitle, cues);
    return NextResponse.json(quiz);
  } catch (error) {
    console.error('AI quiz generation error:', error);
    return NextResponse.json({ error: 'Failed to generate AI quiz from transcript.' }, { status: 502 });
  }
}
