import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import { Session } from '@/lib/models/Session';
import { Analytics, IAnalytics } from '@/lib/models/Analytics';
import { Types } from 'mongoose';
import crypto from 'crypto';
import { headers } from 'next/headers';
import { z } from 'zod';
import { cleanSingleLine } from '@/lib/utils/sanitize';
import { hashPrivateIdentifier } from '@/lib/auth/security';

// Parse user agent for device/browser/OS info
import { UAParser } from 'ua-parser-js';

// Get country/city from IP (optional)
// import geoip from 'geoip-lite'; // Disabled to fix build ENOENT error

// Simple in-memory rate limiter (per instance)
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_EVENTS_PER_WINDOW = 100;
const rateLimitMap = new Map<string, { count: number, resetAt: number }>();

const conversionEventMap: Record<string, string> = {
  newsletter_signup_success: 'newsletter_signup',
  newsletter_signup_confirmed: 'newsletter_confirmed',
  purchase_success: 'purchase',
  contact_submit_success: 'contact_form',
  course_enrollment_success: 'course_enrollment',
};

const optionalText = (max: number) => z.string().max(max).transform(cleanSingleLine).optional();
const analyticsEventSchema = z.object({
  eventId: z.string().min(12).max(128).regex(/^[A-Za-z0-9_.:-]+$/).optional(),
  event: z.string().min(1).max(80).regex(/^[a-z0-9_.:-]+$/i).transform(cleanSingleLine),
  sessionId: z.string().min(8).max(128).transform(cleanSingleLine),
  visitorId: z.string().min(8).max(128).transform(cleanSingleLine),
  page: optionalText(2048),
  referrer: optionalText(2048),
  utmSource: optionalText(200),
  utmMedium: optionalText(200),
  utmCampaign: optionalText(200),
  utmContent: optionalText(200),
  utmTerm: optionalText(200),
  metadata: z.record(z.string().max(100), z.unknown()).refine(
    (value) => JSON.stringify(value).length <= 10_000,
    'Analytics metadata is too large',
  ).optional(),
  timestamp: z.string().datetime({ offset: true }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json().catch(() => null);
    const parsedBody = analyticsEventSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid analytics event' }, { status: 400 });
    }
    const {
      eventId: suppliedEventId,
      event,
      sessionId,
      visitorId,
      page,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      metadata,
      timestamp: _clientTimestamp,
    } = parsedBody.data;
    const eventId = suppliedEventId || crypto.randomUUID();

    // Rate Limiting Check
    const now = Date.now();
    if (rateLimitMap.size > 10_000) {
      for (const [key, value] of rateLimitMap) {
        if (value.resetAt < now) rateLimitMap.delete(key);
      }
    }
    // Keyed on the IP as well: the session id comes from the client and can be rotated freely.
    const forwarded = request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateKey = `${forwarded.split(',')[0].trim()}`;
    const limitData = rateLimitMap.get(rateKey) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
    
    if (now > limitData.resetAt) {
      limitData.count = 0;
      limitData.resetAt = now + RATE_LIMIT_WINDOW;
    }
    
    if (limitData.count >= MAX_EVENTS_PER_WINDOW) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    
    limitData.count++;
    rateLimitMap.set(rateKey, limitData);
    
    // Get IP address and hash it for privacy
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 
               headersList.get('x-real-ip') || 
               'unknown';
    const ipHash = hashPrivateIdentifier(ip);
    
    // Parse user agent
    const userAgent = headersList.get('user-agent') || 'unknown';
    const parser = new UAParser(userAgent);
    const uaData = parser.getResult();
    
    // Get geographic data from IP
    // const geo = geoip.lookup(ip !== 'unknown' ? ip : '');
    const geo = null;
    
    await connectDB();
    
    // Create analytics event
    const analyticsData: Partial<IAnalytics> = {
      eventId,
      event,
      sessionId,
      visitorId,
      page,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      metadata,
      timestamp: new Date(),
      
      // User agent data
      userAgent,
      browser: uaData.browser.name,
      browserVersion: uaData.browser.version,
      os: uaData.os.name,
      device: uaData.device.type === 'mobile' ? 'Mobile' : 
              uaData.device.type === 'tablet' ? 'Tablet' : 'Desktop',
      
      // Geographic data
      ipHash,
      country: undefined, // geo?.country || undefined,
      city: undefined // geo?.city || undefined
    };
    
    // If event relates to specific content, extract IDs
    const isObjectId = (value: unknown): value is string => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
    if (isObjectId(metadata?.postId)) analyticsData.postId = new Types.ObjectId(metadata.postId);
    if (isObjectId(metadata?.projectId)) analyticsData.projectId = new Types.ObjectId(metadata.projectId);
    if (isObjectId(metadata?.productId)) analyticsData.productId = new Types.ObjectId(metadata.productId);
    
    // Idempotent insert: queued clients can retry without inflating events or sessions.
    let inserted = false;
    try {
      const result = await Analytics.updateOne(
        { eventId },
        { $setOnInsert: analyticsData },
        { upsert: true },
      );
      inserted = result.upsertedCount === 1;
    } catch (e) {
      if (!(e instanceof Error && 'code' in e && e.code === 11000)) {
        console.error('Failed to save analytics event:', e);
        return NextResponse.json({ error: 'Analytics event could not be persisted' }, { status: 503 });
      }
    }

    if (!inserted) {
      return NextResponse.json({ success: true, deduplicated: true });
    }
    
    const conversionType = conversionEventMap[event];
    const sessionNow = new Date();
    const isNewVisitor = !(await Session.exists({ visitorId }));
    const sessionUpdate = {
      $set: {
        lastActivityAt: sessionNow,
        exitPage: page,
        ...(conversionType ? { converted: true, conversionType } : {}),
      },
      $setOnInsert: {
        visitorId,
        startedAt: sessionNow,
        entryPage: page,
        referrer,
        utmSource,
        utmMedium,
        utmCampaign,
        userAgent,
        browser: uaData.browser.name,
        os: uaData.os.name,
        device: uaData.device.type === 'mobile' ? 'Mobile' : uaData.device.type === 'tablet' ? 'Tablet' : 'Desktop',
        ipHash,
        isNewVisitor,
        ...(!conversionType ? { converted: false } : {}),
      },
      $inc: { events: 1, pageViews: event === 'page_view' ? 1 : 0 },
    };

    try {
      await Session.updateOne({ sessionId }, sessionUpdate, { upsert: true });
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 11000)) throw error;
      await Session.updateOne({ sessionId }, { $set: sessionUpdate.$set, $inc: sessionUpdate.$inc });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
