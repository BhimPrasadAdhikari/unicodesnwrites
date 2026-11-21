import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { createPublicUploadUrl, storageBackend } from '@/lib/storage/files';

// Proof videos, PDF samples and preview images go straight from the admin's
// browser to storage, so large files never pass through the server. On S3 this
// route returns a signed PUT URL ({ action: 'presign' }); on Vercel Blob it issues
// short-lived client tokens. The editor asks for a presign first and falls back to
// the Blob client when the answer is { backend: 'blob' }.
const MAX_PREVIEW_FILE_SIZE = 200 * 1024 * 1024;
// Raster images only: an SVG can carry script.
const ALLOWED_CONTENT_TYPES = ['video/mp4', 'video/webm', 'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const PATHNAME_PREFIX = 'products/previews/';

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (raw && typeof raw === 'object' && (raw as { action?: unknown }).action === 'presign') {
    return presign(raw as PresignBody);
  }
  const body = raw as HandleUploadBody;

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

type PresignBody = { action: 'presign'; pathname?: unknown; contentType?: unknown; size?: unknown };

async function presign(body: PresignBody) {
  try {
    await requireAdminSession();
    if (storageBackend() !== 's3') return NextResponse.json({ backend: 'blob' });

    const { pathname, contentType, size } = body;
    if (typeof pathname !== 'string' || !pathname.startsWith(PATHNAME_PREFIX) || pathname.includes('..')) {
      return NextResponse.json({ error: 'Invalid upload path' }, { status: 400 });
    }
    if (typeof contentType !== 'string' || !ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }
    if (typeof size !== 'number' || !Number.isInteger(size) || size <= 0 || size > MAX_PREVIEW_FILE_SIZE) {
      return NextResponse.json({ error: 'File must be between 1 byte and 200 MB' }, { status: 400 });
    }

    // Same idea as Blob's addRandomSuffix: a new, unguessable name for every upload.
    const dot = pathname.lastIndexOf('.');
    const suffixed = dot > PATHNAME_PREFIX.length
      ? `${pathname.slice(0, dot)}-${randomUUID()}${pathname.slice(dot)}`
      : `${pathname}-${randomUUID()}`;
    const target = await createPublicUploadUrl(suffixed, contentType, size);
    return NextResponse.json({ backend: 's3', ...target });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Preview upload presign error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
