import type { Model } from 'mongoose';
import { z } from 'zod';

import Comment from '@/lib/models/Comment';
import Review from '@/lib/models/Review';
import { isObjectId } from '@/lib/utils/object-id';

export const MODERATION_ACTIONS = ['approve', 'hide', 'delete'] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];
export type ModerationTarget = 'comments' | 'reviews';

export const MAX_BULK_MODERATION = 100;

export const bulkModerationSchema = z.object({
  ids: z.array(z.string().refine(isObjectId, 'Invalid ID')).min(1).max(MAX_BULK_MODERATION),
  action: z.enum(MODERATION_ACTIONS),
});

// Both collections moderate the same way: an `approved` flag, or removal.
type Moderated = Model<{ approved: boolean }>;
const MODELS: Record<ModerationTarget, Moderated> = {
  comments: Comment as unknown as Moderated,
  reviews: Review as unknown as Moderated,
};

/**
 * Approves, hides or deletes comments or reviews. The single-item and bulk
 * admin routes both go through here so they cannot drift apart. Returns how
 * many documents matched (already-approved ones still count as approved).
 */
export async function moderate(target: ModerationTarget, ids: string[], action: ModerationAction) {
  const model = MODELS[target];
  const filter = { _id: { $in: ids } };
  if (action === 'delete') {
    const result = await model.deleteMany(filter);
    return result.deletedCount;
  }
  const result = await model.updateMany(filter, { $set: { approved: action === 'approve' } });
  return result.matchedCount;
}
