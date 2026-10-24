import { createHash } from 'crypto';

import AiUsageBudget from '@/lib/models/AiUsageBudget';

function boundedLimit(value: string | undefined, fallback: number, maximum: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

async function incrementBelowLimit(key: string, limit: number, expiresAt: Date) {
  try {
    const result = await AiUsageBudget.findOneAndUpdate(
      { key, count: { $lt: limit } },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
      { upsert: true, new: true }
    ).lean();
    return Boolean(result);
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as Error & { code?: number }).code === 11000) return false;
    throw error;
  }
}

export async function consumeAiNotesQuota(clientIdentifier: string) {
  const globalLimit = boundedLimit(process.env.AI_NOTES_DAILY_LIMIT, 250, 10_000);
  const clientLimit = boundedLimit(process.env.AI_NOTES_DAILY_PER_IP_LIMIT, 12, 100);
  const tomorrow = new Date();
  tomorrow.setUTCHours(24, 0, 0, 0);
  const day = new Date().toISOString().slice(0, 10);
  const clientHash = createHash('sha256').update(clientIdentifier).digest('hex').slice(0, 24);

  const clientAllowed = await incrementBelowLimit(`ai-notes:${day}:client:${clientHash}`, clientLimit, tomorrow);
  if (!clientAllowed) return { allowed: false, reason: 'client' as const };
  const globallyAllowed = await incrementBelowLimit(`ai-notes:${day}:global`, globalLimit, tomorrow);
  return globallyAllowed ? { allowed: true as const } : { allowed: false as const, reason: 'global' as const };
}
