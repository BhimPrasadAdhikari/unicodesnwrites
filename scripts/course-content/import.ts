/**
 * Imports a course content folder (see ./load.ts) into the SANDBOX database as a draft.
 *
 * - `--check` validates the folder and prints a summary without touching any database.
 * - Without `--check` it refuses to run unless CODEX_PROJECT_SANDBOX=1 and the connected
 *   database is `unicodesnwrites_sandbox`.
 * - It only ever creates a draft, or updates a course that is still a draft (with a
 *   revision snapshot, like an editor save). Published courses are never touched.
 *
 * Usage:
 *   npx tsx scripts/course-content/import.ts teach-a-small-ai-to-think --check
 *   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/with-sandbox-env.ps1 npx tsx scripts/course-content/import.ts teach-a-small-ai-to-think
 */
import mongoose from 'mongoose';

import { loadCourseFolder } from './load';

const SANDBOX_DB = 'unicodesnwrites_sandbox';

async function main() {
  const slug = process.argv[2];
  const checkOnly = process.argv.includes('--check');
  if (!slug || slug.startsWith('--')) throw new Error('Pass the course slug, e.g. teach-a-small-ai-to-think');

  const input = { ...loadCourseFolder(process.cwd(), slug), status: 'draft' as const, featured: false };
  const lessons = input.modules.flatMap((module) => module.lessons);
  console.log(`"${input.title}": ${input.modules.length} modules, ${lessons.length} lessons`);
  console.log(`  videos ${lessons.filter((l) => l.videoUrl).length}, interactives ${lessons.filter((l) => l.interactive).length}, walkthroughs ${lessons.filter((l) => l.codeWalkthrough).length}`);
  console.log(`  quiz questions ${lessons.reduce((n, l) => n + l.quiz.length, 0)}, exercises ${lessons.reduce((n, l) => n + l.exercises.length, 0)}, downloads ${lessons.reduce((n, l) => n + l.resources.length, 0)}`);
  if (checkOnly) return;

  if (process.env.CODEX_PROJECT_SANDBOX !== '1') throw new Error('Refusing to write: run through scripts/with-sandbox-env.ps1');

  const { connectDB } = await import('@/lib/db/connection');
  const { default: Course } = await import('@/lib/models/Course');
  const { default: User } = await import('@/lib/models/User');
  const { updateCourseVersioned } = await import('@/lib/services/course-admin');

  await connectDB();
  const dbName = mongoose.connection.db?.databaseName;
  if (dbName !== SANDBOX_DB) throw new Error(`Refusing to write to database "${dbName}"; expected ${SANDBOX_DB}`);

  const admin = await User.findOne({ role: 'admin' }).select('_id').lean();
  if (!admin) throw new Error('No admin user in the sandbox database');

  const existing = await Course.findOne({ slug: input.slug }).select('_id status revision').lean();
  if (!existing) {
    const course = await Course.create({ ...input, revision: 1, author: admin._id });
    console.log(`Created draft course ${course._id} in ${dbName}`);
  } else if (existing.status !== 'draft') {
    throw new Error(`Course "${input.slug}" is ${existing.status}; this script only updates drafts`);
  } else {
    await updateCourseVersioned({
      courseId: String(existing._id),
      input,
      expectedRevision: existing.revision || 1,
      authorId: String(admin._id),
      reason: 'manual',
    });
    console.log(`Updated draft course ${existing._id} in ${dbName}`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
