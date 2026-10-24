import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Review from '@/lib/models/Review';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { z } from 'zod';

const approvalSchema = z.object({ approved: z.boolean() });

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteProps) {
  try {
    await requireAdminSession();

    const validation = approvalSchema.safeParse(await req.json().catch(() => null));
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid approval state' }, { status: 400 });
    }

    await dbConnect();

    const { id } = await params;
    if (!/^[a-f\d]{24}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid review ID' }, { status: 400 });
    }

    const review = await Review.findByIdAndUpdate(
      id,
      { approved: validation.data.approved },
      { new: true }
    );

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json(review);
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
