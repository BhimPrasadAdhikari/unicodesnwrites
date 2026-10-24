import { NextResponse } from 'next/server';
import { copy, del } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';
import type { Types } from 'mongoose';

import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { connectDB } from '@/lib/db/connection';
import Product from '@/lib/models/Product';

// Copying large files can take a while; stay inside Vercel's limit.
export const maxDuration = 60;

const isBlobUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.endsWith('.public.blob.vercel-storage.com');
  } catch {
    return false;
  }
};

/**
 * Moves every product's paid file to a new unguessable URL and deletes the old
 * blob, so any URL that ever leaked stops working. Downloads read the URL at
 * download time, so buyers' existing links keep working.
 */
export async function POST() {
  try {
    await requireAdminSession();
    await connectDB();
    const products = await Product.find({}).select('+fileUrl fileName title').lean<Array<{ _id: Types.ObjectId; fileUrl?: string; fileName?: string; title: string }>>();

    const moved: string[] = [];
    const failed: string[] = [];
    for (const product of products) {
      if (!product.fileUrl || !isBlobUrl(product.fileUrl)) continue;
      try {
        const name = (product.fileName || 'download').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').slice(0, 120) || 'download';
        const next = await copy(product.fileUrl, `products/${uuidv4()}-${name}`, { access: 'public', addRandomSuffix: true });
        await Product.updateOne({ _id: product._id }, { $set: { fileUrl: next.url } });
        await del(product.fileUrl);
        moved.push(product.title);
      } catch (error) {
        console.error(`Failed to rotate the file for ${product.title}`, error);
        failed.push(product.title);
      }
    }

    return NextResponse.json({ moved: moved.length, failed }, { status: failed.length ? 207 : 200 });
  } catch (error) {
    if (error instanceof AdminAccessError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    console.error('File rotation failed', error);
    return NextResponse.json({ error: 'File rotation failed' }, { status: 500 });
  }
}
