import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { parseTranscriptText } from '@/lib/utils/transcript';
import { transcriptCueSchema } from '@/lib/utils/validations/course';

const transcriptImportSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  content: z.string().min(1).max(2_000_000),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();
    const input = transcriptImportSchema.parse(await request.json().catch(() => null));
    if (!/\.(srt|vtt|txt)$/i.test(input.filename)) {
      return NextResponse.json(
        { error: 'Upload a timestamped SRT, VTT, or TXT transcript.' },
        { status: 400 },
      );
    }
    const parsed = parseTranscriptText(input.content);
    const cues = z.array(transcriptCueSchema).min(1).max(2_000).parse(parsed.cues);
    return NextResponse.json({ cues, skippedBlocks: parsed.skippedBlocks });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'No valid timestamped transcript cues were found.' },
        { status: 400 },
      );
    }
    console.error('Transcript import failed:', error);
    return NextResponse.json({ error: 'Transcript import failed' }, { status: 500 });
  }
}
