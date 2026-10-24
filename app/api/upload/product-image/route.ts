import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    const fileExtension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
    const fileName = `${randomUUID()}.${fileExtension}`;

    const useVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

    if (useVercelBlob) {
      const blob = await put(`products/${fileName}`, file, {
        access: 'public',
      });

      return NextResponse.json({ url: blob.url });
    } else if (process.env.CODEX_PROJECT_SANDBOX === '1') {
      return NextResponse.json({ error: 'Blob storage is not configured' }, { status: 500 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ url: `/uploads/products/${fileName}` });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
