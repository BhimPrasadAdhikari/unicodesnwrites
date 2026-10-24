import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { generateStudyGuideFromTranscript } from '@/lib/services/ai-study-guide';
import { transcriptCueSchema } from '@/lib/utils/validations/course';

const autoStudyGuideSchema = z.object({
  lessonTitle: z.string().optional().default(''),
  transcript: z.array(transcriptCueSchema).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const input = autoStudyGuideSchema.parse(await request.json().catch(() => null));
    const studyGuide = await generateStudyGuideFromTranscript({
      lessonTitle: input.lessonTitle,
      cues: input.transcript,
      userId: session.user.id,
    });
    return NextResponse.json({ studyGuide });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Valid timestamped transcript cues are required to generate an AI study guide.' },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      if (error.message === 'GROQ_NOT_CONFIGURED') {
        return NextResponse.json({ error: 'Groq API key is not configured.' }, { status: 503 });
      }
      if (error.message === 'STUDY_GUIDE_TRANSCRIPT_REQUIRED') {
        return NextResponse.json({ error: 'Transcript cues are required.' }, { status: 400 });
      }
    }
    console.error('Auto-generate study guide failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI study guide from transcript.' },
      { status: 500 },
    );
  }
}
