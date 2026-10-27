import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { generateGroundedAiNote } from '@/lib/services/ai-notes';
import { isGroqConfigured } from '@/lib/services/groq';
import { consumeAiNotesQuota, releaseAiNotesQuota } from '@/lib/services/ai-notes-quota';
import { getPublishedLessonWorkspace } from '@/lib/services/course-platform';
import { LearnerAccessError, requireCourseAccess } from '@/lib/auth/learner';
import { saveAiNotebookEntry } from '@/lib/services/learner-persistence';

type RouteContext = { params: Promise<{ slug: string; lessonSlug: string }> };
const requestSchema = z.object({ focus: z.string().trim().min(3).max(300) });
const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { slug, lessonSlug } = await params;
  let access: Awaited<ReturnType<typeof requireCourseAccess>>;
  try { access = await requireCourseAccess(slug); } catch (error) { return error instanceof LearnerAccessError ? NextResponse.json({ error: error.message }, { status: error.statusCode }) : NextResponse.json({ error: 'Unable to authorize AI notes.' }, { status: 500 }); }
  const key = access.session.user.id;
  const now = Date.now();
  const current = attempts.get(key);
  if (current && current.resetAt > now && current.count >= 10) return NextResponse.json({ error: 'AI note limit reached. Try again shortly.' }, { status: 429 });
  attempts.set(key, current && current.resetAt > now ? { ...current, count: current.count + 1 } : { count: 1, resetAt: now + 60_000 });
  if (attempts.size > 5_000) attempts.clear();

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter a specific concept or question.' }, { status: 400 });
  const workspace = await getPublishedLessonWorkspace(slug, lessonSlug);
  if (!workspace) return NextResponse.json({ error: 'Published lesson not found' }, { status: 404 });
  if (!isGroqConfigured()) return NextResponse.json({ error: 'AI notes are not configured yet. The grounded study guide remains available.' }, { status: 503 });

  const quota = await consumeAiNotesQuota(key);
  if (!quota.allowed) return NextResponse.json({ error: quota.reason === 'global' ? 'The daily AI notes budget has been reached.' : 'Your daily AI notes limit has been reached.' }, { status: 429 });

  try {
    const note = await generateGroundedAiNote(workspace, parsed.data.focus, access.session.user.id);
    try {
      const saved = await saveAiNotebookEntry(access.session.user.id, workspace, parsed.data.focus, note);
      return NextResponse.json({ ...note, ...saved, savedToNotebook: true });
    } catch (error) {
      console.error('AI notebook persistence failed:', error instanceof Error ? error.message : 'unknown error');
      return NextResponse.json({ ...note, savedToNotebook: false });
    }
  } catch (error) {
    await releaseAiNotesQuota(quota);
    const unavailable = error instanceof Error && error.message === 'GROQ_NOT_CONFIGURED';
    return NextResponse.json(
      { error: unavailable ? 'AI notes are not configured yet. The grounded study guide remains available.' : 'AI notes are temporarily unavailable.' },
      { status: unavailable ? 503 : 502 }
    );
  }
}
