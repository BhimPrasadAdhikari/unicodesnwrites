import { z } from 'zod';

export const MAX_SUBSCRIBER_TAGS = 20;
/** Set by bounce clean-up. Subscribers carrying it are never emailed a campaign. */
export const BOUNCED_TAG = 'bounced';
/** Set when a recipient marked an email as spam (SES complaint). They are unsubscribed too. */
export const COMPLAINED_TAG = 'complained';
export const SUBSCRIBER_TAG_PATTERN = /^[a-z0-9_ -]{1,32}$/;

export const subscriberTagSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(SUBSCRIBER_TAG_PATTERN, 'Tags are 1-32 characters: letters, numbers, spaces, "-" and "_".');

/** Up to 20 tags, normalized and de-duplicated. */
export const subscriberTagListSchema = z
  .array(subscriberTagSchema)
  .max(MAX_SUBSCRIBER_TAGS, `A subscriber can have at most ${MAX_SUBSCRIBER_TAGS} tags.`)
  .transform((tags) => [...new Set(tags)]);

/** Reads a `?tag=` filter; anything that isn't a valid tag is ignored. */
export function parseTagFilter(value: string | null | undefined) {
  const parsed = subscriberTagSchema.safeParse(value ?? '');
  return parsed.success ? parsed.data : '';
}

/** A campaign's audience in words. No tags means every confirmed subscriber. */
export function formatAudience(audienceTags?: readonly string[] | null) {
  const tags = audienceTags || [];
  if (!tags.length) return 'Everyone (all confirmed subscribers)';
  const quoted = tags.map((tag) => `“${tag}”`).join(', ');
  return tags.length === 1 ? `Only subscribers tagged ${quoted}` : `Only subscribers tagged any of ${quoted}`;
}
