// Checks video-series validation, IST date helpers, release gating and blog-post matching. No DB, no network.
import assert from 'node:assert/strict';

import { videoSeriesSchema } from '../../lib/utils/validations/video-series';
import {
  findPartForPost,
  formatPartReleaseDate,
  fromIstDateTimeLocal,
  isPartReleased,
  toIstDateTimeLocal,
  type VideoSeriesView,
} from '../../lib/utils/video-series';

// Validation: URLs become ids, keywords are lower-cased and de-duplicated, bad links are rejected.
const parsed = videoSeriesSchema.parse({
  title: '  LLM   Inference ',
  slug: 'llm-inference',
  parts: [
    { title: 'KV', videoId: 'https://youtu.be/5il9f4sr1Yk?si=abc', publishAt: '2026-10-25T19:30:00+05:30', keywords: ['KV Cache', 'kv cache', ''] },
    { title: 'Batching', videoId: 'https://www.youtube.com/watch?v=zRSAOjBbRcI', publishAt: '2026-11-07T00:00:00Z' },
  ],
});
assert.equal(parsed.title, 'LLM Inference');
assert.equal(parsed.parts[0].videoId, '5il9f4sr1Yk');
assert.deepEqual(parsed.parts[0].keywords, ['kv cache']);
assert.equal(parsed.parts[1].videoId, 'zRSAOjBbRcI');
assert.equal(parsed.published, false);
assert.throws(() => videoSeriesSchema.parse({ title: 'Xy', slug: 'x', parts: [{ title: 'A', videoId: 'https://example.com/v', publishAt: '2026-01-01' }] }));
assert.throws(() => videoSeriesSchema.parse({ title: 'Xy', slug: 'Bad Slug', parts: [] }));
assert.throws(() => videoSeriesSchema.parse({ title: 'Xy', slug: 'x', parts: [{ title: 'A', videoId: '5il9f4sr1Yk', publishAt: 'soon' }] }));

// IST helpers round-trip regardless of the machine's time zone.
assert.equal(toIstDateTimeLocal('2026-11-15T14:00:00.000Z'), '2026-11-15T19:30');
assert.equal(fromIstDateTimeLocal('2026-11-15T19:30')?.toISOString(), '2026-11-15T14:00:00.000Z');
assert.equal(fromIstDateTimeLocal('not a date'), null);
assert.equal(formatPartReleaseDate({ publishAt: '2026-11-15T14:00:00.000Z' }), '15 Nov, 19:30 IST');

// Release gating flips exactly at the release time.
const release = { publishAt: '2026-11-15T14:00:00.000Z' };
assert.equal(isPartReleased(release, new Date('2026-11-15T13:59:59Z')), false);
assert.equal(isPartReleased(release, new Date('2026-11-15T14:00:00Z')), true);

// Blog matching: best score wins, unreleased parts never match.
const series: VideoSeriesView = {
  id: 's1',
  slug: 'llm-inference',
  title: 'LLM Inference',
  description: '',
  featured: true,
  parts: [
    { part: 1, title: 'Inference', videoId: 'wQMjdCi09cM', summary: '', publishAt: '2026-10-18T14:00:00Z', keywords: ['llm inference'] },
    { part: 2, title: 'KV cache', videoId: '5il9f4sr1Yk', summary: '', publishAt: '2026-10-25T14:00:00Z', keywords: ['kv cache'] },
    { part: 5, title: 'Quantization', videoId: 'bFpt3jEcX8o', summary: '', publishAt: '2026-11-15T14:00:00Z', keywords: ['quantization'] },
  ],
};
const now = new Date('2026-11-08T00:00:00Z');
assert.equal(findPartForPost([series], { title: 'The KV-cache, explained', tags: ['llm-inference'] }, now)?.part.part, 2);
assert.equal(findPartForPost([series], { title: 'Notes', tags: ['kv_cache'] }, now)?.part.part, 2);
assert.equal(findPartForPost([series], { title: 'Quantization for beginners' }, now), null);
assert.equal(findPartForPost([series], { title: 'Quantization for beginners' }, new Date('2026-11-16T00:00:00Z'))?.part.part, 5);
assert.equal(findPartForPost([series], { title: 'Building a portfolio site' }, now), null);

console.log('video-series regression: all checks passed');
