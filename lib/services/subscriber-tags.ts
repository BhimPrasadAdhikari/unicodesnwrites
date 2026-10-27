import Subscriber from '@/lib/models/Subscriber';

export interface SubscriberTagCount {
  tag: string;
  /** Confirmed: the people a campaign aimed at this tag would reach. */
  confirmed: number;
  /** Everyone carrying the tag, whatever their status. */
  total: number;
}

/**
 * Who a campaign goes to: confirmed subscribers, narrowed to those carrying any of
 * `audienceTags` when some are set. Bounce clean-up already unsubscribes a dead
 * address, so the "bounced" tag isn't filtered here: readers who bounced once and
 * later re-confirmed still carry it and must keep receiving mail.
 */
export function campaignAudienceFilter(audienceTags?: readonly string[] | null) {
  const tags = (audienceTags || []).filter(Boolean);
  return tags.length
    ? { status: 'confirmed' as const, tags: { $in: [...tags] } }
    : { status: 'confirmed' as const };
}

export function countCampaignAudience(audienceTags?: readonly string[] | null) {
  return Subscriber.countDocuments(campaignAudienceFilter(audienceTags));
}

/** Every tag in use, alphabetically, with how many subscribers carry it. */
export async function countSubscriberTags(): Promise<SubscriberTagCount[]> {
  const rows = await Subscriber.aggregate<SubscriberTagCount>([
    { $match: { 'tags.0': { $exists: true } } },
    {
      $project: {
        tags: 1,
        reachable: { $eq: ['$status', 'confirmed'] },
      },
    },
    { $unwind: '$tags' },
    {
      $group: {
        _id: '$tags',
        confirmed: { $sum: { $cond: ['$reachable', 1, 0] } },
        total: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $limit: 500 },
    { $project: { _id: 0, tag: '$_id', confirmed: 1, total: 1 } },
  ]);
  return rows;
}
