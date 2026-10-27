import { connectDB } from '@/lib/db/connection';
import { openSignatureValue, recordEngagement, verifySignature } from '@/lib/services/newsletter-tracking';
import { isObjectId } from '@/lib/utils/object-id';

// A transparent 1x1 GIF.
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sendId = searchParams.get('s');
  if (isObjectId(sendId) && verifySignature(openSignatureValue(sendId), searchParams.get('t'))) {
    try {
      await connectDB();
      await recordEngagement(sendId, 'open');
    } catch (error) {
      console.error('Failed to record newsletter open', error);
    }
  }
  // Always the pixel, so a mail client never shows a broken image.
  return new Response(PIXEL, {
    headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, max-age=0', 'Content-Length': String(PIXEL.length) },
  });
}
