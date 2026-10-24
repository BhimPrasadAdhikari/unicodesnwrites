import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { cleanSingleLine } from '@/lib/utils/sanitize';

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
  'video/mp4',
]);

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();

    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File must be between 1 byte and 100 MB' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Unsupported product file type' }, { status: 400 });
    }

    const displayName = cleanSingleLine(file.name).slice(0, 255) || 'download';
    const fileName = displayName.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'download';
    const uniqueFileName = `${uuidv4()}-${fileName}`;

    // Upload to Vercel Blob
    // We use 'products' as the directory prefix in the blob store
    const blob = await put(`products/${uniqueFileName}`, file, {
      access: 'public', // Currently Vercel Blob only supports 'public' with unguessable URLs
    });

    return NextResponse.json({
      url: blob.url, 
      fileName: displayName,
      fileSize: file.size,
      storageKey: uniqueFileName, // Keeping this for reference, though url is primary now
    });

  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
