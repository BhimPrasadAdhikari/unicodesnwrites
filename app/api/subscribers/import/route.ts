import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Subscriber from '@/lib/models/Subscriber';
import SuppressedEmail, { hashSuppressedEmail } from '@/lib/models/SuppressedEmail';
import { parseCSV } from '@/lib/utils/csv';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 50_000;
const CHUNK = 500;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
    try {
        await requireAdminSession();

        const formData = await req.formData();
        const file = formData.get('file');

        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        if (file.size > MAX_BYTES) {
            return NextResponse.json({ error: 'CSV is larger than 5 MB. Split it and import in parts.' }, { status: 413 });
        }

        const text = await file.text();
        const records = parseCSV(text).slice(0, MAX_ROWS);

        await dbConnect();

        let invalid = 0;
        // Last row wins when a file lists the same address twice.
        const rows = new Map<string, { email: string; name?: string }>();
        for (const record of records) {
            const email = (record.email || '').trim().toLowerCase();
            if (!EMAIL.test(email) || email.length > 254) {
                invalid++;
                continue;
            }
            rows.set(email, { email, name: record.name?.trim().slice(0, 100) || undefined });
        }

        // One lookup per chunk instead of one per row. Existing records (including
        // people who unsubscribed) are never touched by an import.
        let added = 0;
        let duplicates = 0;
        let suppressed = 0;
        const all = [...rows.values()];
        for (let i = 0; i < all.length; i += CHUNK) {
            const chunk = all.slice(i, i + CHUNK);
            const existing = new Set(
                (await Subscriber.find({ email: { $in: chunk.map((row) => row.email) } }).select('email').lean()).map((row) => row.email)
            );
            // Addresses an admin deleted stay out until the person opts back in themselves.
            const hashes = new Map(chunk.map((row) => [row.email, hashSuppressedEmail(row.email)]));
            const suppressedHashes = new Set(
                (await SuppressedEmail.find({ emailHash: { $in: [...hashes.values()] } }).select('emailHash').lean()).map((row) => row.emailHash)
            );
            const notSuppressed = chunk.filter((row) => !suppressedHashes.has(hashes.get(row.email)!));
            suppressed += chunk.length - notSuppressed.length;
            const fresh = notSuppressed.filter((row) => !existing.has(row.email));
            duplicates += notSuppressed.length - fresh.length;
            if (!fresh.length) continue;
            const now = new Date();
            try {
                const inserted = await Subscriber.insertMany(
                    fresh.map((row) => ({ ...row, source: 'import', status: 'confirmed', confirmedAt: now })),
                    { ordered: false }
                );
                added += inserted.length;
            } catch (err) {
                // ordered:false keeps going past bad rows; count what made it in.
                const inserted = (err as { insertedDocs?: unknown[] }).insertedDocs?.length ?? 0;
                added += inserted;
                invalid += fresh.length - inserted;
            }
        }

        return NextResponse.json({ added, duplicates, invalid, suppressed });

    } catch (error) {
        if (error instanceof AdminAccessError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }

        console.error('Import API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
