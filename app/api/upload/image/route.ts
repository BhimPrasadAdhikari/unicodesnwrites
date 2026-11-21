import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { storePublicFile, StorageNotConfiguredError } from '@/lib/storage/files';

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    // Generate unique filename
    const fileExtension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
    const fileName = `${randomUUID()}.${fileExtension}`;

    const url = await storePublicFile(`blog/${fileName}`, file, file.type);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      return NextResponse.json({ error: 'Blob storage is not configured' }, { status: 500 });
    }
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
