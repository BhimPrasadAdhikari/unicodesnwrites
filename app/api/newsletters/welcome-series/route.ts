import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { recordAdminAction } from '@/lib/services/admin-audit';
import { getWelcomeSeriesSettings, getWelcomeSeriesStats, saveWelcomeSeriesSettings } from '@/lib/services/welcome-series';
import { welcomeSeriesUpdateSchema } from '@/lib/utils/validations/welcome-series';

// GET /api/newsletters/welcome-series — settings and health for the admin page
export async function GET() {
  try {
    await requireAdminSession();
    await dbConnect();
    const [settings, stats] = await Promise.all([getWelcomeSeriesSettings(), getWelcomeSeriesStats()]);
    return NextResponse.json({ settings, stats });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error loading welcome series:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/newsletters/welcome-series — turn the series on/off and edit the scheduled steps' copy
export async function PUT(req: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await req.json().catch(() => null);
    const parsed = welcomeSeriesUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid welcome series settings' }, { status: 400 });
    }
    await dbConnect();

    const previous = await getWelcomeSeriesSettings();
    const settings = await saveWelcomeSeriesSettings(parsed.data);
    const toggled = previous.enabled !== settings.enabled;
    await recordAdminAction(session, {
      action: toggled ? (settings.enabled ? 'enable' : 'disable') : 'update',
      targetType: 'welcome-series',
      summary: settings.steps.slice(1).map((step, index) => `step ${index + 1}: ${step.subject}`).join('; '),
    });
    return NextResponse.json({
      message: settings.enabled ? 'Welcome series saved. It is on for new confirmations.' : 'Welcome series saved. It is off.',
      settings,
    });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error saving welcome series:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
