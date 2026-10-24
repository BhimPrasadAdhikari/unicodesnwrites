import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Subscriber from '@/lib/models/Subscriber';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';

export async function GET(req: NextRequest) {
    try {
        await requireAdminSession();
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const requestedStatus = searchParams.get('status');
        const statuses = ['confirmed', 'pending', 'unsubscribed'] as const;
        const status = statuses.find((candidate) => candidate === requestedStatus);

        if (requestedStatus && !status) {
            return NextResponse.json({ error: 'Invalid subscriber status' }, { status: 400 });
        }

        const query = status ? { status } : {};
        const count = await Subscriber.countDocuments(query);
        
        return NextResponse.json({ count });
    } catch (error) {
        if (error instanceof AdminAccessError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }

        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
