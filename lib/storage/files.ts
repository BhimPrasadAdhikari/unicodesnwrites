import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { copy as blobCopy, del as blobDel, put as blobPut } from '@vercel/blob';

// Where uploaded files live.
//
//   s3    S3_BUCKET is set (AWS hosting). Public files (images, previews) sit under
//         "public/" and are readable by anyone; paid product files sit under
//         "private/" and are only reachable through short-lived signed links.
//         Credentials come from the standard AWS_* variables.
//   blob  BLOB_READ_WRITE_TOKEN is set (the old Vercel setup).
//   local neither, outside the sandbox: files go to public/uploads for offline dev.
//
// Paid files are stored as "s3://bucket/key" so they can never be served as-is.

export type StorageBackend = 's3' | 'blob' | 'local' | 'none';

export class StorageNotConfiguredError extends Error {
  constructor() {
    super('File storage is not configured');
  }
}

export function storageBackend(): StorageBackend {
  if (process.env.S3_BUCKET) return 's3';
  if (process.env.BLOB_READ_WRITE_TOKEN) return 'blob';
  if (process.env.CODEX_PROJECT_SANDBOX === '1') return 'none';
  return 'local';
}

const region = () => process.env.S3_REGION || process.env.AWS_REGION || 'ap-south-1';
const bucket = () => process.env.S3_BUCKET as string;

let client: S3Client | null = null;
function s3() {
  client ??= new S3Client({ region: region() });
  return client;
}

/** Base URL that public objects are served from (no trailing slash). */
export function publicBaseUrl() {
  return (process.env.S3_PUBLIC_BASE_URL || `https://${bucket()}.s3.${region()}.amazonaws.com`).replace(/\/+$/, '');
}

function encodeKey(key: string) {
  return key.split('/').map(encodeURIComponent).join('/');
}

function cleanKey(key: string) {
  const parts = key.split('/').filter((part) => part && part !== '.' && part !== '..');
  if (parts.length === 0) throw new Error('Invalid storage key');
  return parts.join('/');
}

async function toBuffer(body: File | Buffer) {
  return Buffer.isBuffer(body) ? body : Buffer.from(await body.arrayBuffer());
}

/** Saves a file anyone may read (blog images, product images, previews) and returns its URL. */
export async function storePublicFile(key: string, body: File | Buffer, contentType: string): Promise<string> {
  const safeKey = cleanKey(key);
  switch (storageBackend()) {
    case 's3': {
      const objectKey = `public/${safeKey}`;
      await s3().send(new PutObjectCommand({
        Bucket: bucket(),
        Key: objectKey,
        Body: await toBuffer(body),
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }));
      return `${publicBaseUrl()}/${encodeKey(objectKey)}`;
    }
    case 'blob': {
      const blob = await blobPut(safeKey, body, { access: 'public', contentType });
      return blob.url;
    }
    case 'local': {
      const filePath = path.join(process.cwd(), 'public', 'uploads', safeKey);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, await toBuffer(body));
      return `/uploads/${encodeKey(safeKey)}`;
    }
    default:
      throw new StorageNotConfiguredError();
  }
}

/** Saves a paid product file and returns the reference to store on the product. */
export async function storePrivateFile(key: string, body: File | Buffer, contentType: string): Promise<string> {
  const safeKey = cleanKey(key);
  switch (storageBackend()) {
    case 's3': {
      const objectKey = `private/${safeKey}`;
      await s3().send(new PutObjectCommand({ Bucket: bucket(), Key: objectKey, Body: await toBuffer(body), ContentType: contentType }));
      return `s3://${bucket()}/${objectKey}`;
    }
    case 'blob': {
      // Vercel Blob only has public files, so the URL gets an unguessable suffix.
      const blob = await blobPut(safeKey, body, { access: 'public', contentType, addRandomSuffix: true });
      return blob.url;
    }
    default:
      throw new StorageNotConfiguredError();
  }
}

function parseS3Reference(value: string) {
  const match = /^s3:\/\/([^/]+)\/(private\/.+)$/.exec(value);
  if (!match || match[1] !== process.env.S3_BUCKET) return null;
  return { bucket: match[1], key: match[2] };
}

function isBlobUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.endsWith('.public.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

/** True for paid-file references this app is allowed to serve or move. */
export function isManagedPrivateFile(value: string | undefined | null): value is string {
  return Boolean(value && (parseS3Reference(value) || isBlobUrl(value)));
}

/** A URL the server can fetch the paid file from, valid for a few minutes. Null if not ours. */
export async function privateFileFetchUrl(value: string): Promise<URL | null> {
  const ref = parseS3Reference(value);
  if (ref) {
    return new URL(await getSignedUrl(s3(), new GetObjectCommand({ Bucket: ref.bucket, Key: ref.key }), { expiresIn: 300 }));
  }
  return isBlobUrl(value) ? new URL(value) : null;
}

/** Moves a paid file to a new unguessable key, deletes the old one and returns the new reference. */
export async function rotatePrivateFile(value: string, displayName: string): Promise<string> {
  const name = displayName.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').slice(0, 120) || 'download';
  const ref = parseS3Reference(value);
  if (ref) {
    const nextKey = `private/products/${randomUUID()}-${name}`;
    await s3().send(new CopyObjectCommand({ Bucket: ref.bucket, Key: nextKey, CopySource: `${ref.bucket}/${encodeKey(ref.key)}` }));
    await s3().send(new DeleteObjectCommand({ Bucket: ref.bucket, Key: ref.key }));
    return `s3://${ref.bucket}/${nextKey}`;
  }
  if (isBlobUrl(value)) {
    const next = await blobCopy(value, `products/${randomUUID()}-${name}`, { access: 'public', addRandomSuffix: true });
    await blobDel(value);
    return next.url;
  }
  throw new Error('Not a managed product file');
}

/** For uploads that go straight from the browser to S3 (large preview videos). */
export async function createPublicUploadUrl(key: string, contentType: string, size: number) {
  const objectKey = `public/${cleanKey(key)}`;
  const uploadUrl = await getSignedUrl(
    s3(),
    new PutObjectCommand({
      Bucket: bucket(),
      Key: objectKey,
      ContentType: contentType,
      ContentLength: size,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
    { expiresIn: 600 },
  );
  return { uploadUrl, url: `${publicBaseUrl()}/${encodeKey(objectKey)}` };
}
