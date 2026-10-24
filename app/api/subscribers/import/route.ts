import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Subscriber from '@/lib/models/Subscriber';
import { parseCSV } from '@/lib/utils/csv';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';

export async function POST(req: NextRequest) {
    try {
        await requireAdminSession();

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const text = await file.text();
        const records = parseCSV(text);

        await dbConnect();

        let added = 0;
        let duplicates = 0;
        let invalid = 0;

        for (const record of records) {
            if (!record.email || !record.email.includes('@')) {
                invalid++;
                continue;
            }

            try {
                // Check duplicate
                const exists = await Subscriber.findOne({ email: record.email.toLowerCase() });
                if (exists) {
                    duplicates++;
                    continue;
                }

                await Subscriber.create({
                    email: record.email.toLowerCase(),
                    name: record.name,
                    source: 'import',
                    status: 'confirmed', // Auto-confirm imports (assuming consent provided off-platform)
                    confirmedAt: new Date(),
                });
                added++;
            } catch (err) {
                console.error('Import error for record:', record, err);
                invalid++;
            }
        }

        return NextResponse.json({ added, duplicates, invalid });

    } catch (error) {
        if (error instanceof AdminAccessError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }

        console.error('Import API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
