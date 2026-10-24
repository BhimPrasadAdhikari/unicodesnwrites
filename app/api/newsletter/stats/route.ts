import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Subscriber from '@/lib/models/Subscriber';

/**
 * GET /api/newsletter/stats
 * Returns the confirmed subscriber count.
 * Cached at the edge for 1 hour — safe to call on every page load.
 */
export const revalidate = 3600;

export async function GET() {
  try {
    await dbConnect();
    const count = await Subscriber.countDocuments({ status: 'confirmed' });
    return NextResponse.json({ count }, { status: 200 });
  } catch (error) {
    console.error('[newsletter/stats] error:', error);
    return NextResponse.json({ count: 0 }, { status: 200 });
  }
}
