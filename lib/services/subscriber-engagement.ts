import NewsletterSend from '@/lib/models/NewsletterSend';
import Subscriber from '@/lib/models/Subscriber';

/** Tag carried by confirmed subscribers who opened or clicked a recent issue. */
export const ENGAGED_TAG = 'engaged';
export const ENGAGEMENT_WINDOWS = [30, 60, 90, 180] as const;
export const DEFAULT_ENGAGEMENT_DAYS = 90;

export interface EngagedTagResult {
  days: number;
  /** Confirmed subscribers who now carry the tag. */
  engaged: number;
  /** Subscribers the tag was added to in this run. */
  added: number;
  /** Subscribers whose tag was removed because they stopped engaging. */
  removed: number;
}

/**
 * Re-computes the "engaged" tag: confirmed subscribers who opened or clicked any
 * issue sent in the last `days` days get it, everyone else loses it. Sending only
 * to this tag keeps open rates high, which is what inbox providers reward.
 * Opens are approximate (some mail apps load images automatically), so clicks and
 * opens are treated alike.
 */
export async function refreshEngagedTag(days: number = DEFAULT_ENGAGEMENT_DAYS): Promise<EngagedTagResult> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const engagedIds = await NewsletterSend.distinct('subscriber', {
    $or: [{ openedAt: { $gte: since } }, { clickedAt: { $gte: since } }],
  });

  const [added, removed] = await Promise.all([
    engagedIds.length
      ? Subscriber.updateMany(
          { _id: { $in: engagedIds }, status: 'confirmed', tags: { $ne: ENGAGED_TAG } },
          { $addToSet: { tags: ENGAGED_TAG } },
        )
      : Promise.resolve({ modifiedCount: 0 }),
    Subscriber.updateMany(
      { tags: ENGAGED_TAG, $or: [{ _id: { $nin: engagedIds } }, { status: { $ne: 'confirmed' } }] },
      { $pull: { tags: ENGAGED_TAG } },
    ),
  ]);

  const engaged = await Subscriber.countDocuments({ status: 'confirmed', tags: ENGAGED_TAG });

  return {
    days,
    engaged,
    added: added.modifiedCount ?? 0,
    removed: removed.modifiedCount ?? 0,
  };
}
