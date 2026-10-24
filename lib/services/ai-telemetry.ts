import dbConnect from '@/lib/db/connection';
import AiGenerationLog from '@/lib/models/AiGenerationLog';
import { getDateRange } from '@/lib/utils/analytics-helpers';

export type AiTelemetryOverview = {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalRequests: number;
  avgLatencyMs: number;
  successCount: number;
  errorCount: number;
  modelsBreakdown: Array<{ model: string; requests: number; totalTokens: number }>;
  featuresBreakdown: Array<{ feature: string; requests: number; totalTokens: number }>;
  recentLogs: Array<{
    id: string;
    userId?: string;
    feature: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    latencyMs: number;
    status: 'success' | 'error';
    error?: string;
    createdAt: string;
  }>;
};

export async function getAiTelemetryOverview(options: {
  range?: string;
  start?: string;
  end?: string;
}): Promise<AiTelemetryOverview> {
  await dbConnect();
  const { start, end } = getDateRange(options.range || '30days', options.start, options.end);

  const query = {
    createdAt: { $gte: start, $lte: end },
  };

  const logs = await AiGenerationLog.find(query)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const aggregate = await AiGenerationLog.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalTokens: { $sum: '$totalTokens' },
        promptTokens: { $sum: '$promptTokens' },
        completionTokens: { $sum: '$completionTokens' },
        totalRequests: { $sum: 1 },
        avgLatencyMs: { $avg: '$latencyMs' },
        successCount: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
        },
        errorCount: {
          $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] },
        },
      },
    },
  ]);

  const modelsAgg = await AiGenerationLog.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$model',
        requests: { $sum: 1 },
        totalTokens: { $sum: '$totalTokens' },
      },
    },
    { $sort: { totalTokens: -1 } },
  ]);

  const featuresAgg = await AiGenerationLog.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$feature',
        requests: { $sum: 1 },
        totalTokens: { $sum: '$totalTokens' },
      },
    },
    { $sort: { totalTokens: -1 } },
  ]);

  const stats = aggregate[0] || {
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalRequests: 0,
    avgLatencyMs: 0,
    successCount: 0,
    errorCount: 0,
  };

  return {
    totalTokens: stats.totalTokens,
    promptTokens: stats.promptTokens,
    completionTokens: stats.completionTokens,
    totalRequests: stats.totalRequests,
    avgLatencyMs: Math.round(stats.avgLatencyMs || 0),
    successCount: stats.successCount,
    errorCount: stats.errorCount,
    modelsBreakdown: modelsAgg.map((m) => ({
      model: m._id || 'unknown',
      requests: m.requests,
      totalTokens: m.totalTokens,
    })),
    featuresBreakdown: featuresAgg.map((f) => ({
      feature: f._id || 'unknown',
      requests: f.requests,
      totalTokens: f.totalTokens,
    })),
    recentLogs: logs.map((log) => ({
      id: String(log._id),
      userId: log.userId,
      feature: log.feature,
      model: log.model,
      promptTokens: log.promptTokens,
      completionTokens: log.completionTokens,
      totalTokens: log.totalTokens,
      latencyMs: log.latencyMs,
      status: log.status,
      error: log.error,
      createdAt: log.createdAt.toISOString(),
    })),
  };
}
