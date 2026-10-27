import Subscriber from '@/lib/models/Subscriber';
import { BOUNCED_TAG } from '@/lib/utils/validations/subscriber';

export interface SubscriberTagCount {
  tag: string;
  /** Confirmed and not bounced: the people a campaign aimed at this tag would reach. */
  confirmed: number;
  /** Everyone carrying the tag, whatever their status. */
  total: number;
}

/**
 * Who a campaign goes to: confirmed subscribers, narrowed to those carrying any of
 * `audienceTags` when some are set. Bounced addresses are left out either way.
 */
export function campaignAudienceFilter(audienceTags?: readonly string[] | null) {
  const tags = (audienceTags || []).filter(Boolean);
  return {
    status: 'confirmed' as const,
    tags: tags.length ? { $in: [...tags], $nin: [BOUNCED_TAG] } : { $ne: BOUNCED_TAG },
  };
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
        reachable: { $and: [{ $eq: ['$status', 'confirmed'] }, { $not: [{ $in: [BOUNCED_TAG, '$tags'] }] }] },
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
