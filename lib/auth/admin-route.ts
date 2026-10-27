import { NextResponse } from 'next/server';

import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { connectDB } from '@/lib/db/connection';
import { actionForMethod, recordAdminAction } from '@/lib/services/admin-audit';
import { isObjectId } from '@/lib/utils/object-id';

type IdContext = { params: Promise<{ id: string }> };
type Session = Awaited<ReturnType<typeof requireAdminSession>>;

/** Short "key=value" list of a PATCH body's simple fields, for the audit log. */
async function describeChanges(request: Request) {
  if (request.method.toUpperCase() !== 'PATCH') return undefined;
  const body = await request.clone().json().catch(() => null);
  if (!body || typeof body !== 'object') return undefined;
  return Object.entries(body as Record<string, unknown>)
    .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
    .map(([key, value]) => `${key}=${String(value).slice(0, 60)}`)
    .join(', ') || undefined;
}

/**
 * Wraps an admin route that acts on one document: checks the admin session,
 * validates the id, connects to the database, maps errors to JSON and records
 * successful changes in the admin audit log.
 */
export function adminIdRoute(handler: (input: { request: Request; id: string; session: Session }) => Promise<Response>) {
  return async (request: Request, context: IdContext) => {
    try {
      const session = await requireAdminSession();
      const { id } = await context.params;
      if (!isObjectId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
      await connectDB();
      const action = actionForMethod(request.method);
      const summary = action ? await describeChanges(request) : undefined;
      const response = await handler({ request, id, session });
      if (action && response.ok) {
        // /api/admin/<type>/<id>
        const targetType = new URL(request.url).pathname.split('/')[3] || 'unknown';
        await recordAdminAction(session, { action, targetType, targetId: id, summary });
      }
      return response;
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
