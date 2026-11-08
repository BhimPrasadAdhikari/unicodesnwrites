/**
 * Creates or replaces the "LLM Inference" video series (matched by slug).
 *
 * - Dry run by default: validates the data and reports what would change.
 * - Pass --apply to write. Safe to re-run: it upserts by slug.
 * - Reads MONGODB_URI from the process environment only; it never loads an env file.
 *
 * After it runs, the series is editable at /dashboard/videos.
 *
 * Usage (sandbox):
 *   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/with-sandbox-env.ps1 npx tsx scripts/seed-video-series.ts
 *   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/with-sandbox-env.ps1 npx tsx scripts/seed-video-series.ts --apply
 */
import mongoose from 'mongoose';

import { connectDB } from '@/lib/db/connection';
import { VideoSeries } from '@/lib/models/VideoSeries';
import { videoSeriesSchema, type VideoSeriesInput } from '@/lib/utils/validations/video-series';

const apply = process.argv.includes('--apply');

// Parts go public on Sundays at 19:30 IST.
const sunday = (date: string) => `${date}T19:30:00+05:30`;

const LLM_INFERENCE_SERIES: VideoSeriesInput = {
  title: 'LLM Inference',
  slug: 'llm-inference',
  description:
    'What actually happens when a language model answers you: the forward pass, the KV cache, memory bandwidth, batching, quantization and the tricks that make serving fast.',
  published: true,
  featured: true,
  parts: [
    {
      title: 'How LLM Inference Works',
      videoId: 'wQMjdCi09cM',
      summary: 'From prompt to tokens: prefill, decode and why a model writes one token at a time.',
      publishAt: sunday('2026-10-18'),
      keywords: ['llm inference', 'how llms generate', 'prefill', 'autoregressive decoding', 'token generation'],
    },
    {
      title: 'How the KV Cache Works',
      videoId: '5il9f4sr1Yk',
      summary: 'Why models cache keys and values, and what that saves on every new token.',
      publishAt: sunday('2026-10-25'),
      keywords: ['kv cache', 'key-value cache', 'key value cache'],
    },
    {
      title: 'Why LLMs Are Memory-Bound',
      videoId: '_LfMpQmC0VM',
      summary: 'Decoding is limited by memory bandwidth, not compute, and that shapes everything else.',
      publishAt: sunday('2026-11-01'),
      keywords: ['memory bound', 'memory bandwidth', 'arithmetic intensity', 'roofline'],
    },
    {
      title: 'How LLM Batching Works',
      videoId: 'zRSAOjBbRcI',
      summary: 'Static, dynamic and continuous batching, and how servers keep the GPU busy.',
      publishAt: '2026-11-07T00:00:00+05:30', // already public
      keywords: ['continuous batching', 'dynamic batching', 'in-flight batching', 'llm batching'],
    },
    {
      title: 'Quantization',
      videoId: 'bFpt3jEcX8o',
      summary: 'Shrinking weights to 8 and 4 bits to fit bigger models and read memory faster.',
      publishAt: sunday('2026-11-15'),
      keywords: ['quantization', 'quantisation', 'int8', 'int4', 'gptq', 'awq'],
    },
    {
      title: 'FlashAttention',
      videoId: 'vLKDOXwun2c',
      summary: 'Tiling attention so it never writes the full attention matrix to slow memory.',
      publishAt: sunday('2026-11-22'),
      keywords: ['flashattention', 'flash attention'],
    },
    {
      title: 'Speculative Decoding',
      videoId: 'Xvprb20iJHs',
      summary: 'A small draft model guesses ahead and the big model checks several tokens at once.',
      publishAt: sunday('2026-11-29'),
      keywords: ['speculative decoding', 'draft model', 'speculative sampling'],
    },
    {
      title: 'Sampling',
      videoId: 'KIT09unZsU4',
      summary: 'Temperature, top-k and top-p: how the next token is actually picked.',
      publishAt: sunday('2026-12-06'),
      keywords: ['top-p', 'top-k', 'nucleus sampling', 'temperature sampling', 'sampling strategies'],
    },
    {
      title: 'Parallelism',
      videoId: 'my7_9TgAO9g',
      summary: 'Tensor, pipeline and data parallelism for serving models that do not fit on one GPU.',
      publishAt: sunday('2026-12-13'),
      keywords: ['tensor parallelism', 'pipeline parallelism', 'model parallelism'],
    },
  ],
};

async function main() {
  const data = videoSeriesSchema.parse(LLM_INFERENCE_SERIES);
  console.log(`Series "${data.title}" (/videos/${data.slug}), ${data.parts.length} parts:`);
  for (const [index, part] of data.parts.entries()) {
    console.log(`  ${index + 1}. ${part.title} [${part.videoId}] public ${part.publishAt.toISOString()}`);
  }

  await connectDB();
  const existing = await VideoSeries.exists({ slug: data.slug });
  console.log(existing ? 'A series with this slug exists and will be replaced.' : 'No series with this slug yet; it will be created.');

  if (!apply) {
    console.log('Dry run: nothing written. Re-run with --apply to write.');
  } else {
    await VideoSeries.findOneAndUpdate({ slug: data.slug }, data, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
    console.log('Written.');
  }
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
