import { NextResponse } from 'next/server';

import { connectDB } from '@/lib/db/connection';
import { clickSignatureValue, recordEngagement, verifySignature } from '@/lib/services/newsletter-tracking';
import { isObjectId } from '@/lib/utils/object-id';

const HOME = process.env.NEXT_PUBLIC_APP_URL || 'https://www.unicodesnwrites.tech';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sendId = searchParams.get('s');
  const url = searchParams.get('u') || '';

  // Only URLs we signed into an email are followed, so this is never an open redirect.
  const valid = isObjectId(sendId) && /^https?:\/\//i.test(url) && verifySignature(clickSignatureValue(sendId, url), searchParams.get('t'));
  if (!valid) return NextResponse.redirect(HOME, 302);

  try {
    await connectDB();
    await recordEngagement(sendId, 'click');
  } catch (error) {
    console.error('Failed to record newsletter click', error);
  }
  return NextResponse.redirect(url, 302);
}
