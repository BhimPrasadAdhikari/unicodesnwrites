import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

const guardedRoutes = [
  {
    path: 'app/api/subscribers/export/route.ts',
    sink: /Subscriber\.find\(\{\s*status:\s*'confirmed'\s*\}\)/,
    behavior: /toCSV/,
  },
  {
    path: 'app/api/subscribers/import/route.ts',
    sink: /Subscriber\.create/,
    behavior: /parseCSV/,
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
