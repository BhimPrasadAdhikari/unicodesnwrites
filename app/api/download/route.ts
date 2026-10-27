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
            return NextResponse.redirect(new URL('/products/download?status=error', req.url), 303);
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

    console.error('Product file is not on approved storage:', product._id);
    return NextResponse.redirect(new URL('/products/download?status=error', req.url), 303);

  } catch (error) {
    if (error instanceof ProductPurchaseError) {
      // People reach this URL from an email or a button, so explain the problem on a page.
      const reason =
        error.statusCode === 410 ? 'expired'
        : error.statusCode === 403 && /limit/i.test(error.message) ? 'limit'
        : error.statusCode === 403 ? 'unavailable'
        : 'invalid';
      return NextResponse.redirect(new URL(`/products/download?status=${reason}`, req.url), 303);
    }

    console.error('Download error:', error);
    return NextResponse.redirect(new URL('/products/download?status=error', req.url), 303);
  }
}
