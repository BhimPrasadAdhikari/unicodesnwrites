import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const read = (path) => readFileSync(join(root, path), 'utf8');

const guardedRoutes = [
  'app/api/newsletters/route.ts',
  'app/api/newsletters/[id]/route.ts',
  'app/api/newsletters/[id]/send/route.ts',
  'app/api/newsletters/[id]/test/route.ts',
  'app/api/newsletters/from-posts/route.ts',
  'app/api/newsletters/welcome-series/route.ts',
];

for (const route of guardedRoutes) {
  const source = read(route);

  assert.match(
    source,
    /requireAdminSession/,
    `${route} must require an admin session before newsletter admin work`
  );
  assert.match(
    source,
    /adminUnauthorizedResponse|AdminAccessError|requireAdminResponse/,
    `${route} must reject anonymous or non-admin callers`
  );
}

const createRoute = read('app/api/newsletters/route.ts');
assert.doesNotMatch(
  createRoute,
  /MOCK fallback|60d0fe4f5311236168a109ca/,
  'newsletter creation must not fall back to a mock author for anonymous callers'
);
assert.match(
  createRoute,
  /author:\s*session\.user\.id/,
  'legitimate admin newsletter creation must still use the authenticated admin as author'
);

const schedulerRoute = read('app/api/newsletters/scheduler/route.ts');
assert.match(
  schedulerRoute,
  /if \(!(requiredSecret|configuredSecrets\.length)\) \{\s*return false;\s*\}/s,
  'scheduler must fail closed when no scheduler secret (NEWSLETTER_SCHEDULER_SECRET / CRON_SECRET) is configured'
);
assert.match(
  schedulerRoute,
  /providedSecret === requiredSecret|timingSafeEqual/,
  'scheduler must still allow legitimate requests with the configured secret'
);

console.log('newsletter auth regression checks passed');
