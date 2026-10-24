import { NextRequest, NextResponse } from 'next/server';
import { requireAdminResponse } from '@/lib/auth/admin';
import { generateLessonMetadata } from '@/lib/services/ai-lesson-metadata';
import type { ITranscriptCue } from '@/lib/models/Course';

export async function POST(request: NextRequest) {
  try {
    const unauthorized = await requireAdminResponse();
    if (unauthorized) return unauthorized;

    const body = await request.json().catch(() => null);
    const lessonTitle = body?.lessonTitle;
    const cues: ITranscriptCue[] = body?.cues || [];
    const topicContext = body?.topicContext || '';

    if (!lessonTitle || typeof lessonTitle !== 'string') {
      return NextResponse.json({ error: 'Lesson title is required.' }, { status: 400 });
    }

    const metadata = await generateLessonMetadata({
      lessonTitle,
      cues,
      topicContext,
    });

    return NextResponse.json(metadata);
  } catch (error) {
    console.error('AI lesson metadata generation error:', error);
    return NextResponse.json({ error: 'Failed to generate lesson metadata.' }, { status: 502 });
  }
}
