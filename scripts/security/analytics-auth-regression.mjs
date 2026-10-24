import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

const protectedRoutes = [
  {
    path: 'app/api/analytics/content/route.ts',
    sink: /getContentAnalytics/,
  },
  {
    path: 'app/api/analytics/devices/route.ts',
    sink: /getDeviceBreakdown/,
  },
  {
    path: 'app/api/analytics/export/route.ts',
    sink: /getAnalyticsExport/,
  },
  {
    path: 'app/api/analytics/funnels/route.ts',
    sink: /getConversionFunnels/,
  },
  {
    path: 'app/api/analytics/newsletter-pages/route.ts',
    sink: /getNewsletterPageAnalytics/,
  },
  {
    path: 'app/api/analytics/newsletter-sources/route.ts',
    sink: /getNewsletterSourceAnalytics/,
  },
  {
    path: 'app/api/analytics/overview/route.ts',
    sink: /getAnalyticsOverview/,
  },
  {
    path: 'app/api/analytics/posts/[id]/route.ts',
    sink: /getPostAnalytics/,
  },
  {
    path: 'app/api/analytics/top-pages/route.ts',
    sink: /getTopPages/,
  },
  {
    path: 'app/api/analytics/top-referrers/route.ts',
    sink: /getTopReferrers/,
  },
  {
    path: 'app/api/analytics/traffic-sources/route.ts',
    sink: /getTrafficSources/,
  },
  {
    path: 'app/api/analytics/traffic-timeline/route.ts',
    sink: /getTrafficTimeline/,
  },
  {
    path: 'app/api/analytics/events/route.ts',
    sink: /getEventAnalytics/,
  },
];

for (const route of protectedRoutes) {
  const source = read(route.path);
  const guardIndex = source.search(/getServerSession|requireAdminSession|requireAdminResponse/);
  const unauthorizedIndex = source.search(/AdminAccessError|requireAdminResponse|Unauthorized/);
  const dbIndex = source.indexOf('await connectDB()');

  assert.notEqual(guardIndex, -1, `${route.path} must require an admin session`);
  assert.notEqual(
    unauthorizedIndex,
    -1,
    `${route.path} must reject anonymous or non-admin callers`
  );

  if (dbIndex !== -1) {
    assert.ok(
      guardIndex < dbIndex,
      `${route.path} must authorize before analytics database reads`
    );
  }

  assert.match(source, route.sink, `${route.path} must preserve its intended analytics read`);
}

for (const publicRoute of [
  'app/api/analytics/track/route.ts',
  'app/api/analytics/privacy/route.ts',
]) {
  const source = read(publicRoute);

  assert.doesNotMatch(
    source,
    /requireAdminSession/,
    `${publicRoute} should remain public for analytics collection or user privacy access`
  );
}

console.log('analytics auth regression checks passed');
