/**
 * Checks the "Teach a Small AI to Think" content folder and the Tiny Adder
 * trainer behind the in-browser training visualization. No database needed.
 *
 *   npx tsx scripts/regression/course-content.ts
 */
import assert from 'node:assert/strict';

import { groupAdvantages, trainTinyAdder } from '@/lib/courses/tiny-adder';
import { loadCourseFolder } from '../course-content/load';

const final = (overrides: Parameters<typeof trainTinyAdder>[0]) => trainTinyAdder({ steps: 200, ...overrides }).at(-1)!;

// Group advantages: zero when every answer scores the same, symmetric otherwise.
assert.deepEqual(groupAdvantages([1, 1, 1, 1]), [0, 0, 0, 0]);
const advantages = groupAdvantages([1, 0, 1, 0]);
assert.ok(Math.abs(advantages[0] - 1) < 1e-3 && Math.abs(advantages[1] + 1) < 1e-3);

// Training is deterministic for a seed.
assert.deepEqual(trainTinyAdder({ steps: 20 }), trainTinyAdder({ steps: 20 }));

// The four presets shown to learners must tell the story their captions describe.
const healthy = final({});
assert.ok(healthy.accuracy > 0.7, `healthy run should learn (accuracy ${healthy.accuracy})`);
const stuck = final({ G: 2 });
assert.ok(stuck.accuracy < healthy.accuracy - 0.3, `G=2 should stall (accuracy ${stuck.accuracy})`);
const hacking = final({ buggy: true });
assert.ok(hacking.meanReward > 0.7 && hacking.accuracy < 0.15, `buggy reward should be hacked (reward ${hacking.meanReward}, accuracy ${hacking.accuracy})`);
const leash = final({ beta: 0.05 });
assert.ok(leash.accuracy < healthy.accuracy && leash.accuracy > stuck.accuracy, `KL leash should slow learning (accuracy ${leash.accuracy})`);

// The course folder must build into a valid course.
const course = loadCourseFolder(process.cwd(), 'teach-a-small-ai-to-think');
const lessons = course.modules.flatMap((module) => module.lessons);
for (const lesson of lessons) {
  assert.ok(lesson.article.length > 2_000, `${lesson.slug}: article is missing or very short`);
  assert.ok(lesson.quiz.length >= 4, `${lesson.slug}: needs at least 4 quiz questions`);
  assert.ok(lesson.exercises.length >= 1, `${lesson.slug}: needs at least one exercise`);
  for (const step of lesson.codeWalkthrough?.steps || []) {
    const lines = lesson.codeWalkthrough!.files[step.file].split('\n').length;
    assert.ok(!step.endLine || step.endLine <= lines, `${lesson.slug}: walkthrough step "${step.title}" points past the end of ${step.file}`);
  }
}

console.log(`ok: ${course.modules.length} modules, ${lessons.length} lessons; Tiny Adder healthy ${healthy.accuracy.toFixed(2)}, stuck ${stuck.accuracy.toFixed(2)}, hacked ${hacking.accuracy.toFixed(2)}, leash ${leash.accuracy.toFixed(2)}`);
