/**
 * Rewrites retired lesson types (see LEGACY_LESSON_TYPE_MAP) to their current
 * replacement in every course and every stored revision snapshot.
 *
 * - Dry run by default: reports what would change and writes nothing.
 * - Pass --apply to write. Safe to re-run: documents already migrated no longer match.
 * - Uses raw collection updates, so course `revision` numbers are NOT bumped and
 *   editors holding the current revision can still save.
 * - Reads MONGODB_URI from the process environment only; it never loads an env file.
 *
 * Usage (sandbox):
 *   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/with-sandbox-env.ps1 npx tsx scripts/migrate-legacy-lesson-types.ts
 *   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/with-sandbox-env.ps1 npx tsx scripts/migrate-legacy-lesson-types.ts --apply
 */
import mongoose from 'mongoose';

import { connectDB } from '@/lib/db/connection';
import Course from '@/lib/models/Course';
import CourseRevision from '@/lib/models/CourseRevision';
import { LEGACY_LESSON_TYPE_MAP } from '@/lib/utils/validations/course';

type LessonLike = { key?: string; type?: string };
type ModuleLike = { lessons?: LessonLike[] };

const apply = process.argv.includes('--apply');

function legacyLessons(modules: ModuleLike[] | undefined, legacyType: string) {
  return (modules || []).flatMap((module) =>
    (module.lessons || []).filter((lesson) => lesson.type === legacyType).map((lesson) => lesson.key || '(no key)'),
  );
}

function describeTarget() {
  try {
    const { host } = mongoose.connection;
    const name = mongoose.connection.name;
    return `${host || 'unknown host'}/${name || 'unknown db'}`;
  } catch {
    return 'unknown target';
  }
}

async function migrateType(legacyType: string, replacement: string) {
  const courseFilter = { 'modules.lessons.type': legacyType };
  const revisionFilter = { 'snapshot.modules.lessons.type': legacyType };

  const courses = await Course.collection
    .find(courseFilter, { projection: { title: 1, slug: 1, revision: 1, modules: 1 } })
    .toArray();
  const revisions = await CourseRevision.collection
    .find(revisionFilter, { projection: { course: 1, revision: 1, 'snapshot.modules': 1 } })
    .toArray();

  for (const course of courses) {
    const keys = legacyLessons(course.modules as ModuleLike[], legacyType);
    console.log(`  course ${course._id} (${course.slug}, revision ${course.revision ?? 1}): ${keys.length} lesson(s) [${keys.join(', ')}]`);
  }
  for (const revision of revisions) {
    const snapshot = revision.snapshot as { modules?: ModuleLike[] } | undefined;
    const keys = legacyLessons(snapshot?.modules, legacyType);
    console.log(`  revision snapshot ${revision._id} (course ${revision.course}, revision ${revision.revision}): ${keys.length} lesson(s) [${keys.join(', ')}]`);
  }
  console.log(`  "${legacyType}" -> "${replacement}": ${courses.length} course(s), ${revisions.length} revision snapshot(s)`);

  if (!apply || (courses.length === 0 && revisions.length === 0)) return;

  const arrayFilters = [{ 'lesson.type': legacyType }];
  const courseResult = await Course.collection.updateMany(
    courseFilter,
    { $set: { 'modules.$[].lessons.$[lesson].type': replacement } },
    { arrayFilters },
  );
  const revisionResult = await CourseRevision.collection.updateMany(
    revisionFilter,
    { $set: { 'snapshot.modules.$[].lessons.$[lesson].type': replacement } },
    { arrayFilters },
  );
  console.log(`  updated ${courseResult.modifiedCount} course(s), ${revisionResult.modifiedCount} revision snapshot(s)`);
}

async function main() {
  await connectDB();
  console.log(`${apply ? 'APPLY' : 'DRY RUN'} against ${describeTarget()}`);
  for (const [legacyType, replacement] of Object.entries(LEGACY_LESSON_TYPE_MAP)) {
    await migrateType(legacyType, replacement);
  }
  if (!apply) console.log('No changes written. Re-run with --apply to migrate.');
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error('Migration failed:', error);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
  });
