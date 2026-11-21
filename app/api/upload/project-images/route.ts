import { NextRequest, NextResponse } from 'next/server';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { storePublicFile, StorageNotConfiguredError } from '@/lib/storage/files';
import { randomUUID } from 'crypto';

const MAX_FILES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();

    const formData = await req.formData();
    const entries = formData.getAll('file');
    const files = entries.filter((entry): entry is File => entry instanceof File);
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }
    if (files.length !== entries.length || files.length > MAX_FILES) {
      return NextResponse.json({ error: `Upload between 1 and ${MAX_FILES} images` }, { status: 400 });
    }
    if (files.some((file) => !EXTENSIONS[file.type] || file.size === 0 || file.size > MAX_FILE_SIZE)) {
      return NextResponse.json({ error: 'Images must be JPG, PNG, WebP, or GIF files no larger than 5 MB' }, { status: 400 });
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      const filename = `${randomUUID()}.${EXTENSIONS[file.type]}`;
      uploadedUrls.push(await storePublicFile(`projects/${filename}`, file, file.type));
    }

    return NextResponse.json({ urls: uploadedUrls }, { status: 201 });
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      return NextResponse.json({ error: 'Blob storage is not configured' }, { status: 500 });
    }
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
