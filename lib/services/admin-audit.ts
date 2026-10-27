import type { Session } from 'next-auth';
import { Types } from 'mongoose';

import AdminAuditLog from '@/lib/models/AdminAuditLog';

export interface AdminAction {
  action: string;
  targetType: string;
  targetId?: string;
  summary?: string;
}

/**
 * Records an admin change. Never throws: a failed log write must not undo or
 * fail the change it describes.
 */
export async function recordAdminAction(session: Session, entry: AdminAction) {
  try {
    const actorId = session.user?.id;
    await AdminAuditLog.create({
      actor: actorId && Types.ObjectId.isValid(actorId) ? actorId : undefined,
      actorEmail: session.user?.email || 'unknown',
      action: entry.action.slice(0, 80),
      targetType: entry.targetType.slice(0, 40),
      targetId: entry.targetId?.slice(0, 80),
      summary: entry.summary?.slice(0, 500),
    });
  } catch (error) {
    console.error('Admin audit log write failed:', error instanceof Error ? error.message : 'unknown error');
  }
}

const METHOD_ACTIONS: Record<string, string> = { POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' };

/** The action name for a mutating request, or null for reads. */
export function actionForMethod(method: string) {
  return METHOD_ACTIONS[method.toUpperCase()] ?? null;
}
