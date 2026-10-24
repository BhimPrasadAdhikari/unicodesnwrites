import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/config/auth';
import { connectDB } from '@/lib/db/connection';
import Purchase from '@/lib/models/Purchase';
import { consumeRateLimit, normalizeEmail } from '@/lib/auth/security';
import { reissueDownloadToken } from '@/lib/services/purchase';
import { isObjectId } from '@/lib/utils/object-id';

/**
 * Download a product you bought, from /account. Uses the current link while it
 * is valid and otherwise issues a fresh one, so buyers never get locked out.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !session.user.sessionValid) {
    return NextResponse.redirect(new URL('/login?from=%2Faccount', req.url), 303);
  }

  const { id } = await params;
  if (!isObjectId(id)) {
    return NextResponse.redirect(new URL('/products/download?status=invalid', req.url), 303);
  }

  await connectDB();
  const purchase = await Purchase.findOne({ _id: id, customerEmail: normalizeEmail(session.user.email) })
    // Older purchases kept the email's original case.
    .collation({ locale: 'en', strength: 2 })
    .select('status downloadToken downloadTokenExpiry downloadCount maxDownloads')
    .lean<{ status: string; downloadToken?: string; downloadTokenExpiry?: Date; downloadCount?: number; maxDownloads?: number }>();
  if (!purchase || purchase.status !== 'completed') {
    return NextResponse.redirect(new URL('/products/download?status=unavailable', req.url), 303);
  }

  const stillValid =
    purchase.downloadToken &&
    purchase.downloadTokenExpiry &&
    new Date(purchase.downloadTokenExpiry) > new Date() &&
    (purchase.downloadCount ?? 0) < (purchase.maxDownloads ?? 5);

  let token = purchase.downloadToken;
  if (!stillValid) {
    const limit = await consumeRateLimit({ scope: 'download-reissue', identifier: id, limit: 5, windowSeconds: 24 * 60 * 60 });
    if (!limit.allowed) {
      return NextResponse.redirect(new URL('/products/download?status=limit', req.url), 303);
    }
    token = (await reissueDownloadToken(id)).downloadToken;
  }

  return NextResponse.redirect(new URL(`/api/download?token=${encodeURIComponent(token || '')}`, req.url), 303);
}
