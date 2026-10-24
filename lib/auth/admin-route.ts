import { NextResponse } from 'next/server';

import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { connectDB } from '@/lib/db/connection';
import { isObjectId } from '@/lib/utils/object-id';

type IdContext = { params: Promise<{ id: string }> };
type Session = Awaited<ReturnType<typeof requireAdminSession>>;

/**
 * Wraps an admin route that acts on one document: checks the admin session,
 * validates the id, connects to the database and maps errors to JSON.
 */
export function adminIdRoute(handler: (input: { request: Request; id: string; session: Session }) => Promise<Response>) {
  return async (request: Request, context: IdContext) => {
    try {
      const session = await requireAdminSession();
      const { id } = await context.params;
      if (!isObjectId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
      await connectDB();
      return await handler({ request, id, session });
    } catch (error) {
      if (error instanceof AdminAccessError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
      }
      console.error('Admin route failed:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

export async function readJson(request: Request) {
  return request.json().catch(() => null);
}
