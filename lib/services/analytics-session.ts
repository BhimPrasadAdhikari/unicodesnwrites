import { format, eachDayOfInterval } from 'date-fns';
import { connectDB } from '@/lib/db/connection';
import { Analytics, IAnalytics } from '@/lib/models/Analytics';
import { Post } from '@/lib/models/Post';
import { Session } from '@/lib/models/Session';
import { calculateChange, getDateRange } from '@/lib/utils/analytics-helpers';
import mongoose from 'mongoose';

export class AnalyticsReportError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'AnalyticsReportError';
    this.statusCode = statusCode;
  }
}

export interface AnalyticsRangeInput {
  range?: string | null;
  start?: string | null;
  end?: string | null;
}

export interface AnalyticsDateRange {
  start: Date;
  end: Date;
}

export function resolveAnalyticsRange(input: AnalyticsRangeInput, fallback = '7days'): AnalyticsDateRange {
  return getDateRange(input.range || fallback, input.start || undefined, input.end || undefined);
}

export async function getAnalyticsOverview(input: AnalyticsRangeInput) {
  const dateRange = resolveAnalyticsRange(input);
  const duration = dateRange.end.getTime() - dateRange.start.getTime();
  const prevStart = new Date(dateRange.start.getTime() - duration);
  const prevEnd = new Date(dateRange.end.getTime() - duration);

  await connectDB();

  const [totalViews, uniqueVisitors, sessionStats, bounces] = await Promise.all([
    Analytics.countDocuments({
      event: 'page_view',
      timestamp: { $gte: dateRange.start, $lte: dateRange.end },
    }),
    Session.distinct('visitorId', {
      startedAt: { $gte: dateRange.start, $lte: dateRange.end },
    }).then((ids) => ids.length),
    Session.aggregate([
      { $match: { startedAt: { $gte: dateRange.start, $lte: dateRange.end } } },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$duration' },
          avgPages: { $avg: '$pageViews' },
          totalSessions: { $sum: 1 },
        },
      },
    ]),
    Session.countDocuments({
      startedAt: { $gte: dateRange.start, $lte: dateRange.end },
      pageViews: 1,
    }),
  ]);

  const [prevTotalViews, prevUniqueVisitors, prevSessionStats, prevBounces] = await Promise.all([
    Analytics.countDocuments({
      event: 'page_view',
      timestamp: { $gte: prevStart, $lte: prevEnd },
    }),
    Session.distinct('visitorId', {
      startedAt: { $gte: prevStart, $lte: prevEnd },
    }).then((ids) => ids.length),
    Session.aggregate([
      { $match: { startedAt: { $gte: prevStart, $lte: prevEnd } } },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$duration' },
          avgPages: { $avg: '$pageViews' },
          totalSessions: { $sum: 1 },
        },
      },
    ]),
    Session.countDocuments({
      startedAt: { $gte: prevStart, $lte: prevEnd },
      pageViews: 1,
    }),
  ]);

  const stats = sessionStats[0] || { avgDuration: 0, avgPages: 0, totalSessions: 0 };
  const prevStats = prevSessionStats[0] || { avgDuration: 0, avgPages: 0, totalSessions: 0 };
  const bounceRate = stats.totalSessions > 0 ? (bounces / stats.totalSessions) * 100 : 0;
  const prevBounceRate = prevStats.totalSessions > 0 ? (prevBounces / prevStats.totalSessions) * 100 : 0;

  return {
    views: {
      value: totalViews,
      change: calculateChange(totalViews, prevTotalViews),
    },
    visitors: {
      value: uniqueVisitors,
      change: calculateChange(uniqueVisitors, prevUniqueVisitors),
    },
    avgDuration: {
      value: Math.round(stats.avgDuration || 0),
      change: calculateChange(stats.avgDuration || 0, prevStats.avgDuration || 0),
    },
    bounceRate: {
      value: parseFloat(bounceRate.toFixed(1)),
      change: calculateChange(bounceRate, prevBounceRate),
    },
  };
}

export async function getTrafficTimeline(input: AnalyticsRangeInput) {
  const dateRange = resolveAnalyticsRange(input);
  await connectDB();

  const data = await Analytics.aggregate([
    {
      $match: {
        event: 'page_view',
        timestamp: { $gte: dateRange.start, $lte: dateRange.end },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        views: { $sum: 1 },
        visitors: { $addToSet: '$visitorId' },
      },
    },
    {
      $project: {
        date: '$_id',
        views: 1,
        visitors: { $size: '$visitors' },
      },
    },
    { $sort: { date: 1 } },
  ]);

  const allDays = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
  return allDays.map((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const existing = data.find((d) => d.date === dateStr);
    return {
      date: format(day, 'MMM dd'),
      views: existing ? existing.views : 0,
      visitors: existing ? existing.visitors : 0,
      fullDate: dateStr,
    };
  });
}

export async function getDeviceBreakdown(input: AnalyticsRangeInput) {
  const dateRange = resolveAnalyticsRange(input);
  await connectDB();

  const data = await Session.aggregate([
    { $match: { startedAt: { $gte: dateRange.start, $lte: dateRange.end } } },
    {
      $group: {
        _id: { $ifNull: ['$device', 'Desktop'] },
        count: { $sum: 1 },
      },
    },
  ]);

  return data
    .map((item) => ({ name: item._id, value: item.count }))
    .sort((a, b) => b.value - a.value);
}

export async function getTopPages(input: AnalyticsRangeInput) {
  const dateRange = resolveAnalyticsRange(input);
  await connectDB();

  return Analytics.aggregate([
    {
      $match: {
        event: 'page_view',
        timestamp: { $gte: dateRange.start, $lte: dateRange.end },
      },
    },
    {
      $group: {
        _id: '$page',
        views: { $sum: 1 },
        visitors: { $addToSet: '$visitorId' },
      },
    },
    {
      $project: {
        page: '$_id',
        views: 1,
        visitors: { $size: '$visitors' },
      },
    },
    { $sort: { views: -1 } },
    { $limit: 20 },
  ]);
}

export async function getTopReferrers(input: AnalyticsRangeInput) {
  const dateRange = resolveAnalyticsRange(input);
  await connectDB();

  return Session.aggregate([
    {
      $match: {
        startedAt: { $gte: dateRange.start, $lte: dateRange.end },
        referrer: { $ne: null, $exists: true },
      },
    },
    {
      $group: {
        _id: '$referrer',
        views: { $sum: 1 },
        visitors: { $addToSet: '$visitorId' },
      },
    },
    {
      $project: {
        referrer: '$_id',
        views: 1,
        visitors: { $size: '$visitors' },
      },
    },
    { $match: { referrer: { $ne: '' } } },
    { $sort: { views: -1 } },
    { $limit: 20 },
  ]);
}

export async function getTrafficSources(input: AnalyticsRangeInput) {
  const dateRange = resolveAnalyticsRange(input);
  await connectDB();

  const data = await Session.aggregate([
    { $match: { startedAt: { $gte: dateRange.start, $lte: dateRange.end } } },
    {
      $group: {
        _id: {
          $cond: [{ $ifNull: ['$referrer', false] }, '$referrer', 'Direct'],
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  const categories: Record<string, number> = {
    Direct: 0,
    Search: 0,
    Social: 0,
    Referral: 0,
    Other: 0,
  };

  data.forEach((item) => {
    const source = String(item._id || '');
    const count = item.count;

    if (source === 'Direct' || source === '') {
      categories.Direct += count;
    } else if (source.includes('google') || source.includes('bing') || source.includes('yahoo') || source.includes('duckduckgo')) {
      categories.Search += count;
    } else if (source.includes('twitter') || source.includes('facebook') || source.includes('linkedin') || source.includes('instagram') || source.includes('t.co')) {
      categories.Social += count;
    } else {
      categories.Referral += count;
    }
  });

  return Object.entries(categories)
    .map(([name, value]) => ({ name, value }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

export async function getAnalyticsExport(input: AnalyticsRangeInput, fallbackRange = '30days') {
  const dateRange = resolveAnalyticsRange(input, fallbackRange);
  await connectDB();

  const events = await Analytics.find({
    timestamp: { $gte: dateRange.start, $lte: dateRange.end },
  })
    .sort({ timestamp: -1 })
    .limit(10000)
    .lean();

  return {
    range: dateRange,
    count: events.length,
    events,
  };
}

function eventCategory(event: string) {
  if (event.includes('newsletter')) return 'Newsletter';
  if (event.includes('purchase') || event.includes('product')) return 'Commerce';
  if (event.includes('course') || event.includes('lesson') || event.includes('quiz')) return 'Learning';
  if (event.includes('blog') || event.includes('series')) return 'Content';
  if (event.includes('contact')) return 'Contact';
  if (event.includes('download')) return 'Downloads';
  return 'Engagement';
}

export async function getEventAnalytics(input: AnalyticsRangeInput & { limit?: number }) {
  const dateRange = resolveAnalyticsRange(input);
  const duration = Math.max(1, dateRange.end.getTime() - dateRange.start.getTime());
  const previousStart = new Date(dateRange.start.getTime() - duration);
  const limit = Math.min(Math.max(input.limit || 10, 1), 50);
  await connectDB();

  const aggregate = (start: Date, end: Date) => Analytics.aggregate<{ _id: string; count: number; lastOccurred: Date }>([
    { $match: { timestamp: { $gte: start, $lte: end }, event: { $ne: 'page_view' } } },
    { $group: { _id: '$event', count: { $sum: 1 }, lastOccurred: { $max: '$timestamp' } } },
    { $sort: { count: -1 } },
  ]);
  const [current, previous] = await Promise.all([
    aggregate(dateRange.start, dateRange.end),
    aggregate(previousStart, dateRange.start),
  ]);
  const previousCounts = new Map(previous.map((item) => [item._id, item.count]));
  const events = current.slice(0, limit).map((item) => {
    const previousCount = previousCounts.get(item._id) || 0;
    return {
      name: item._id,
      count: item.count,
      change: previousCount ? Math.round(((item.count - previousCount) / previousCount) * 100) : item.count ? 100 : 0,
      category: eventCategory(item._id),
      lastOccurred: item.lastOccurred.toISOString(),
      icon: '',
    };
  });

  return { events, total: current.reduce((sum, item) => sum + item.count, 0), range: dateRange, updated: new Date().toISOString() };
}

export function analyticsEventsToCSV(events: IAnalytics[]) {
  const headers = ['Timestamp', 'Event', 'Page', 'VisitorID', 'SessionID', 'Country', 'Device', 'OS', 'Browser'];
  const csvRows = [headers.join(',')];

  events.forEach((event) => {
    const row = [
      format(new Date(event.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      event.event,
      event.page || '',
      event.visitorId || '',
      event.sessionId || '',
      event.country || '',
      event.device || '',
      event.os || '',
      event.browser || '',
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`);

    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

export async function getContentAnalytics(input: AnalyticsRangeInput & { type?: string | null }) {
  const type = input.type || 'blog';
  const dateRange = resolveAnalyticsRange(input);
  await connectDB();

  const matchQuery: Record<string, unknown> = {
    timestamp: { $gte: dateRange.start, $lte: dateRange.end },
  };

  let idField = '';
  let collection = '';

  if (type === 'blog') {
    matchQuery.postId = { $exists: true };
    idField = '$postId';
    collection = 'posts';
  } else if (type === 'projects') {
    matchQuery.projectId = { $exists: true };
    idField = '$projectId';
    collection = 'projects';
  } else if (type === 'products') {
    matchQuery.productId = { $exists: true };
    idField = '$productId';
    collection = 'products';
  } else {
    throw new AnalyticsReportError('Invalid type', 400);
  }

  return Analytics.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: idField,
        views: { $sum: { $cond: [{ $eq: ['$event', 'page_view'] }, 1, 0] } },
        visitors: { $addToSet: '$visitorId' },
        clicks: {
          $sum: {
            $cond: [{ $in: ['$event', ['button_click', 'external_link_click', 'product_buy_click']] }, 1, 0],
          },
        },
      },
    },
    {
      $lookup: {
        from: collection,
        localField: '_id',
        foreignField: '_id',
        as: 'details',
      },
    },
    { $unwind: '$details' },
    {
      $project: {
        id: '$_id',
        title: '$details.title',
        slug: '$details.slug',
        views: 1,
        visitors: { $size: '$visitors' },
        clicks: 1,
        ctr: {
          $cond: [{ $gt: ['$views', 0] }, { $multiply: [{ $divide: ['$clicks', '$views'] }, 100] }, 0],
        },
      },
    },
    { $sort: { views: -1 } },
    { $limit: 20 },
  ]);
}

export async function getConversionFunnels(input: AnalyticsRangeInput) {
  const dateRange = resolveAnalyticsRange(input);
  await connectDB();

  const cohort = async (events: string[]) => {
    const rows = await Analytics.aggregate<{ _id: null; steps: boolean[][] }>([
      { $match: { timestamp: { $gte: dateRange.start, $lte: dateRange.end }, event: { $in: events } } },
      { $project: { event: 1, identity: { $ifNull: ['$visitorId', { $ifNull: ['$sessionId', { $toString: '$_id' }] }] } } },
      { $group: { _id: '$identity', events: { $addToSet: '$event' } } },
      {
        $project: {
          reached: events.map((event, index) => ({
            $and: events.slice(0, index + 1).map((requiredEvent) => ({ $in: [requiredEvent, '$events'] })),
          })),
        },
      },
      { $group: { _id: null, steps: { $push: '$reached' } } },
    ]);
    const actors = rows[0]?.steps || [];
    return events.map((_, index) => actors.reduce((count, reached) => count + (reached[index] ? 1 : 0), 0));
  };

  const [newsletter, purchase, contact, course] = await Promise.all([
    cohort(['newsletter_signup_impression', 'newsletter_signup_attempt', 'newsletter_signup_success', 'newsletter_signup_confirmed']),
    cohort(['product_view', 'product_buy_click', 'purchase_success']),
    cohort(['contact_page_view', 'contact_submit_attempt', 'contact_submit_success']),
    cohort(['course_view', 'course_enroll_click', 'course_enrollment_success', 'lesson_view']),
  ]);

  return {
    newsletter: [
      { name: 'Form Seen', value: newsletter[0] },
      { name: 'Started Form', value: newsletter[1] },
      { name: 'Subscribed', value: newsletter[2] },
      { name: 'Confirmed', value: newsletter[3] },
    ],
    purchase: [
      { name: 'Product Views', value: purchase[0] },
      { name: 'Buy Clicked', value: purchase[1] },
      { name: 'Purchased', value: purchase[2] },
    ],
    contact: [
      { name: 'Contact Page', value: contact[0] },
      { name: 'Started', value: contact[1] },
      { name: 'Submitted', value: contact[2] },
    ],
    course: [
      { name: 'Course Views', value: course[0] },
      { name: 'Enroll Clicked', value: course[1] },
      { name: 'Enrolled', value: course[2] },
      { name: 'Lesson Opened', value: course[3] },
    ],
  };
}

export async function getNewsletterPageAnalytics(input: AnalyticsRangeInput) {
  const dateRange = resolveAnalyticsRange(input);
  await connectDB();

  return Analytics.aggregate([
    {
      $match: {
        timestamp: { $gte: dateRange.start, $lte: dateRange.end },
        event: { $in: ['newsletter_signup_impression', 'newsletter_signup_attempt', 'newsletter_signup_success'] },
      },
    },
    { $project: { event: 1, page: { $ifNull: ['$page', '(unknown)'] } } },
    {
      $group: {
        _id: '$page',
        impressions: { $sum: { $cond: [{ $eq: ['$event', 'newsletter_signup_impression'] }, 1, 0] } },
        attempts: { $sum: { $cond: [{ $eq: ['$event', 'newsletter_signup_attempt'] }, 1, 0] } },
        subscribed: { $sum: { $cond: [{ $eq: ['$event', 'newsletter_signup_success'] }, 1, 0] } },
      },
    },
    {
      $project: {
        page: '$_id',
        impressions: 1,
        attempts: 1,
        subscribed: 1,
        subscribeRate: {
          $cond: [{ $gt: ['$impressions', 0] }, { $multiply: [{ $divide: ['$subscribed', '$impressions'] }, 100] }, 0],
        },
      },
    },
    { $sort: { subscribed: -1, attempts: -1 } },
    { $limit: 25 },
  ]);
}

export async function getNewsletterSourceAnalytics(input: AnalyticsRangeInput) {
  const dateRange = resolveAnalyticsRange(input);
  await connectDB();

  return Analytics.aggregate([
    {
      $match: {
        timestamp: { $gte: dateRange.start, $lte: dateRange.end },
        event: {
          $in: [
            'newsletter_signup_impression',
            'newsletter_signup_attempt',
            'newsletter_signup_success',
            'newsletter_signup_confirmed',
          ],
        },
      },
    },
    { $project: { event: 1, source: { $ifNull: ['$metadata.source', 'unknown'] } } },
    {
      $group: {
        _id: '$source',
        impressions: { $sum: { $cond: [{ $eq: ['$event', 'newsletter_signup_impression'] }, 1, 0] } },
        attempts: { $sum: { $cond: [{ $eq: ['$event', 'newsletter_signup_attempt'] }, 1, 0] } },
        subscribed: { $sum: { $cond: [{ $eq: ['$event', 'newsletter_signup_success'] }, 1, 0] } },
        confirmed: { $sum: { $cond: [{ $eq: ['$event', 'newsletter_signup_confirmed'] }, 1, 0] } },
      },
    },
    {
      $project: {
        source: '$_id',
        impressions: 1,
        attempts: 1,
        subscribed: 1,
        confirmed: 1,
        attemptRate: {
          $cond: [{ $gt: ['$impressions', 0] }, { $multiply: [{ $divide: ['$attempts', '$impressions'] }, 100] }, 0],
        },
        subscribeRate: {
          $cond: [{ $gt: ['$attempts', 0] }, { $multiply: [{ $divide: ['$subscribed', '$attempts'] }, 100] }, 0],
        },
        confirmRate: {
          $cond: [{ $gt: ['$subscribed', 0] }, { $multiply: [{ $divide: ['$confirmed', '$subscribed'] }, 100] }, 0],
        },
      },
    },
    { $sort: { confirmed: -1, subscribed: -1, attempts: -1 } },
    { $limit: 20 },
  ]);
}

export async function getPostAnalytics(postId: string, input: AnalyticsRangeInput) {
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new AnalyticsReportError('Invalid post ID', 400);
  }

  const dateRange = resolveAnalyticsRange(input);
  const duration = dateRange.end.getTime() - dateRange.start.getTime();
  const prevStart = new Date(dateRange.start.getTime() - duration);
  const prevEnd = new Date(dateRange.end.getTime() - duration);
  const postObjectId = new mongoose.Types.ObjectId(postId);

  await connectDB();

  const post = await Post.findById(postId).select('title slug category').lean();
  if (!post) {
    throw new AnalyticsReportError('Post not found', 404);
  }

  const [currentViews, currentVisitors, prevViews, prevVisitors, timelineData, referrers, devices, countries] =
    await Promise.all([
      Analytics.countDocuments({
        postId: postObjectId,
        event: 'page_view',
        timestamp: { $gte: dateRange.start, $lte: dateRange.end },
      }),
      Analytics.distinct('visitorId', {
        postId: postObjectId,
        event: 'page_view',
        timestamp: { $gte: dateRange.start, $lte: dateRange.end },
      }).then((ids) => ids.length),
      Analytics.countDocuments({
        postId: postObjectId,
        event: 'page_view',
        timestamp: { $gte: prevStart, $lte: prevEnd },
      }),
      Analytics.distinct('visitorId', {
        postId: postObjectId,
        event: 'page_view',
        timestamp: { $gte: prevStart, $lte: prevEnd },
      }).then((ids) => ids.length),
      Analytics.aggregate([
        {
          $match: {
            postId: postObjectId,
            event: 'page_view',
            timestamp: { $gte: dateRange.start, $lte: dateRange.end },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            views: { $sum: 1 },
            visitors: { $addToSet: '$visitorId' },
          },
        },
        { $project: { date: '$_id', views: 1, visitors: { $size: '$visitors' } } },
        { $sort: { date: 1 } },
      ]),
      Analytics.aggregate([
        {
          $match: {
            postId: postObjectId,
            event: 'page_view',
            timestamp: { $gte: dateRange.start, $lte: dateRange.end },
          },
        },
        { $group: { _id: '$referrer', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Analytics.aggregate([
        {
          $match: {
            postId: postObjectId,
            event: 'page_view',
            timestamp: { $gte: dateRange.start, $lte: dateRange.end },
          },
        },
        { $group: { _id: '$device', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Analytics.aggregate([
        {
          $match: {
            postId: postObjectId,
            event: 'page_view',
            timestamp: { $gte: dateRange.start, $lte: dateRange.end },
          },
        },
        { $group: { _id: '$country', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

  const allDays = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
  const timeline = allDays.map((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const existing = timelineData.find((item) => item.date === dateStr);
    return {
      date: format(day, 'MMM dd'),
      views: existing ? existing.views : 0,
      visitors: existing ? existing.visitors : 0,
      fullDate: dateStr,
    };
  });

  return {
    post: {
      title: post.title,
      slug: post.slug,
      category: post.category,
    },
    summary: {
      views: {
        value: currentViews,
        change: calculateChange(currentViews, prevViews),
      },
      visitors: {
        value: currentVisitors,
        change: calculateChange(currentVisitors, prevVisitors),
      },
    },
    timeline,
    referrers: referrers.map((item) => ({ name: item._id || 'Direct', value: item.count })),
    devices: devices.map((item) => ({ name: item._id || 'Unknown', value: item.count })),
    countries: countries.map((item) => ({ name: item._id || 'Unknown', value: item.count })),
  };
}
