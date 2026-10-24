import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { put } from '@vercel/blob';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
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

    // Check environment for storage strategy
    const useVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

    if (useVercelBlob) {
      // Vercel Blob Storage
      for (const file of files) {
        const filename = `${randomUUID()}.${EXTENSIONS[file.type]}`;
        
        const blob = await put(`projects/${filename}`, file, {
          access: 'public',
        });
        
        uploadedUrls.push(blob.url);
      }
    } else if (process.env.CODEX_PROJECT_SANDBOX === '1') {
      return NextResponse.json({ error: 'Blob storage is not configured' }, { status: 500 });
    } else {
      // Local Storage (Development)
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'projects');
      
      try {
        await mkdir(uploadDir, { recursive: true });
      } catch (e) {
        // Ignore if exists
      }

      for (const file of files) {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            
            const filename = `${randomUUID()}.${EXTENSIONS[file.type]}`;
            const filepath = join(uploadDir, filename);

            await writeFile(filepath, buffer);
            
            uploadedUrls.push(`/uploads/projects/${filename}`);
      }
    }

    return NextResponse.json({ urls: uploadedUrls }, { status: 201 });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
