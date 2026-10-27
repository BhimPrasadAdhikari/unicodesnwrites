import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';

// Proof videos, PDF samples and preview images go straight from the admin's
// browser to Vercel Blob. Server routes on Vercel cap request bodies at ~4.5 MB,
// so this route only issues short-lived client tokens.
const MAX_PREVIEW_FILE_SIZE = 200 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = ['video/mp4', 'video/webm', 'application/pdf', 'image/*'];
const PATHNAME_PREFIX = 'products/previews/';

export async function POST(request: NextRequest) {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        await requireAdminSession();

        if (!pathname.startsWith(PATHNAME_PREFIX) || pathname.includes('..')) {
          throw new Error('Invalid upload path');
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_PREVIEW_FILE_SIZE,
          addRandomSuffix: true,
        };
      },
      // No onUploadCompleted: the editor saves the returned URL with the product.
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    if (error instanceof Error && error.message === 'Invalid upload path') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Preview upload token error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 400 });
  }
}
