import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import {
  authorizeProductDownload,
  consumeAuthorizedProductDownload,
  ProductPurchaseError,
} from '@/lib/services/purchase';

function getApprovedFileUrl(value: string) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      !url.hostname.endsWith('.public.blob.vercel-storage.com')
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function contentDisposition(fileName: string) {
  const fallback = fileName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'download';
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    const headersList = await headers();
    const context = {
      ip: headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || 'unknown',
      userAgent: headersList.get('user-agent') || 'unknown',
    };
    const { purchase, product } = await authorizeProductDownload(token || '');

    const fileUrl = getApprovedFileUrl(product.fileUrl);
    if (fileUrl) {
        const response = await fetch(fileUrl, { redirect: 'error' });
        if (!response.ok) {
            console.error(`Failed to fetch product file from approved storage: ${response.status}`);
            return NextResponse.json({ error: 'File not found on storage' }, { status: 404 });
        }

        await consumeAuthorizedProductDownload(purchase, product, context);
        const fileStream = response.body;

        return new NextResponse(fileStream as unknown as BodyInit, {
        headers: {
            'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
            'Content-Disposition': contentDisposition(product.fileName),
             // Vercel Blob might not send content-length in a way we can just pass through blindly, but we can try
            ...(response.headers.get('Content-Length') ? { 'Content-Length': response.headers.get('Content-Length')! } : {}),
        },
        });
    }

    return NextResponse.json({ error: 'File not found or invalid storage path' }, { status: 404 });

  } catch (error) {
    if (error instanceof ProductPurchaseError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
