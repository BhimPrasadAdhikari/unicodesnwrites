import { NextRequest, NextResponse } from 'next/server';
import { fetchGitHubStats } from '@/lib/services/github';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { z } from 'zod';

const requestSchema = z.object({
  url: z.string().trim().min(1).max(2048),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();

    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Enter a valid GitHub URL' }, { status: 400 });
    }

    const stats = await fetchGitHubStats(parsed.data.url);

    if (!stats) {
      return NextResponse.json({ error: 'Failed to fetch GitHub stats' }, { status: 502 });
    }

    return NextResponse.json({ stats });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('GitHub stats API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
