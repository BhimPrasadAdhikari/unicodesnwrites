import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

import { LearnerAccessError, requireVerifiedSession } from '@/lib/auth/learner';
import { connectDB } from '@/lib/db/connection';
import LearnerNotebookEntry from '@/lib/models/LearnerNotebookEntry';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const session = await requireVerifiedSession();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Notebook entry not found.' }, { status: 404 });
    await connectDB();
    const deleted = await LearnerNotebookEntry.deleteOne({ _id: id, user: session.user.id });
    return deleted.deletedCount
      ? NextResponse.json({ message: 'Notebook entry deleted.' })
      : NextResponse.json({ error: 'Notebook entry not found.' }, { status: 404 });
  } catch (error) {
    if (error instanceof LearnerAccessError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    console.error('Notebook deletion failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Notebook entry could not be deleted.' }, { status: 500 });
  }
}
