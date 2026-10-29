import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

const guardedRoutes = [
  {
    path: 'app/api/subscribers/export/route.ts',
    // Filtered export; with no status filter it still exports confirmed subscribers only.
    sink: /status && STATUSES\.has\(status\) \? status : 'confirmed'[\s\S]*Subscriber\.find\(query\)/,
    behavior: /toCSV/,
  },
  {
    path: 'app/api/subscribers/import/route.ts',
    sink: /Subscriber\.insertMany/,
    behavior: /parseCSV/,
  },
  {
    path: 'app/api/subscribers/[id]/route.ts',
    sink: /Subscriber\.findByIdAndUpdate\(params\.id, \{ \$set: \{ tags \} \}/,
    behavior: /recordAdminAction\(session, \{\s*action: 'update-tags'/,
  },
  {
    path: 'app/api/subscribers/suppress-list/route.ts',
    sink: /suppressSubscriberEmails\(emails, BOUNCED_TAG\)/,
    behavior: /recordAdminAction\(session, \{ action: 'mark-bounced'/,
  },
  {
    path: 'app/api/subscribers/tags/route.ts',
    sink: /countSubscriberTags\(\)/,
    behavior: /countCampaignAudience/,
  },
  {
    path: 'app/api/subscribers/[id]/test-email/route.ts',
    sink: /sendEmail/,
    behavior: /Subscriber\.findById/,
  },
];

for (const route of guardedRoutes) {
  const source = read(route.path);
  const guardIndex = source.indexOf('requireAdminSession');
  const unauthorizedIndex = source.search(/adminUnauthorizedResponse|AdminAccessError|requireAdminResponse/);
  const dbIndex = source.indexOf('await dbConnect()');

  assert.notEqual(guardIndex, -1, `${route.path} must require an admin session`);
  assert.notEqual(
    unauthorizedIndex,
    -1,
    `${route.path} must reject anonymous or non-admin callers`
  );
  assert.ok(
    guardIndex < dbIndex,
    `${route.path} must authorize before database-backed subscriber work`
  );
  assert.match(source, route.sink, `${route.path} must still perform the intended admin action`);
  assert.match(source, route.behavior, `${route.path} must preserve legitimate behavior`);
}

console.log('subscriber auth regression checks passed');
