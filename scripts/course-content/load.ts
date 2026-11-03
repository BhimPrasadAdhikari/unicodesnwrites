/**
 * Builds a course document from a content folder:
 *
 *   content/courses/<slug>/course.json
 *   content/courses/<slug>/lessons/<lesson-slug>/{lesson.json, article.md, walkthrough.json, code/*, exercises/*.md}
 *   content/courses/<slug>/youtube.json                           (optional, { "<lesson-slug>": "<YouTube video id>" })
 *   content/courses/<slug>/lessons/<lesson-slug>/transcript.json  (optional, transcript cues)
 *   public/course-media/<slug>/<lesson-slug>.{mp4,jpg,cues.json}   (optional, git-ignored videos)
 *
 * A lesson listed in youtube.json plays from YouTube; otherwise a local mp4 is used if there is one.
 *
 * and validates it with the same schema the course editor uses.
 */
import fs from 'node:fs';
import path from 'node:path';

import { courseInputSchema, type CourseInput } from '@/lib/utils/validations/course';

type CourseFile = Omit<CourseInput, 'modules'> & {
  modules: Array<{ key: string; title: string; description?: string; lessons: string[] }>;
  /** Public URL prefix for self-hosted lesson videos, e.g. a Blob or CDN folder. */
  videoBaseUrl?: string;
};

type LessonFile = Record<string, unknown> & {
  slug: string;
  exercises?: Array<{ key: string; title: string; hints?: string[] }>;
};

const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;
const readText = (file: string) => fs.readFileSync(file, 'utf8');
const readOptional = (file: string) => (fs.existsSync(file) ? readText(file) : '');

function loadLesson(lessonDir: string, slug: string, mediaDir: string, videoBaseUrl: string, youtubeVideoId?: string) {
  const lesson = readJson<LessonFile>(path.join(lessonDir, 'lesson.json'));
  if (lesson.slug !== slug) throw new Error(`${lessonDir}: lesson.json slug "${lesson.slug}" does not match folder`);

  const exercises = (lesson.exercises || []).map((exercise) => ({
    ...exercise,
    hints: exercise.hints || [],
    prompt: readText(path.join(lessonDir, 'exercises', `${exercise.key}.prompt.md`)),
    solution: readText(path.join(lessonDir, 'exercises', `${exercise.key}.solution.md`)),
  }));

  let codeWalkthrough: unknown;
  const walkthroughFile = path.join(lessonDir, 'walkthrough.json');
  if (fs.existsSync(walkthroughFile)) {
    const walkthrough = readJson<{ title: string; files: string[]; steps: unknown[] }>(walkthroughFile);
    codeWalkthrough = {
      title: walkthrough.title,
      steps: walkthrough.steps,
      files: Object.fromEntries(walkthrough.files.map((name) => [name, readText(path.join(lessonDir, 'code', name))])),
    };
  }

  const media: Record<string, unknown> = {};
  const transcriptFile = path.join(lessonDir, 'transcript.json');
  if (youtubeVideoId) {
    media.youtubeVideoId = youtubeVideoId;
    if (fs.existsSync(transcriptFile)) media.transcript = readJson(transcriptFile);
  } else if (fs.existsSync(path.join(mediaDir, `${slug}.mp4`))) {
    media.videoUrl = `${videoBaseUrl}/${slug}.mp4`;
    if (fs.existsSync(path.join(mediaDir, `${slug}.jpg`))) media.videoPosterUrl = `${videoBaseUrl}/${slug}.jpg`;
    const cuesFile = path.join(mediaDir, `${slug}.cues.json`);
    if (fs.existsSync(cuesFile)) media.transcript = readJson(cuesFile);
    else if (fs.existsSync(transcriptFile)) media.transcript = readJson(transcriptFile);
  }

  return {
    ...lesson,
    article: readOptional(path.join(lessonDir, 'article.md')),
    exercises,
    codeWalkthrough,
    ...media,
  };
}

export function loadCourseFolder(root: string, slug: string): CourseInput {
  const courseDir = path.join(root, 'content', 'courses', slug);
  const course = readJson<CourseFile>(path.join(courseDir, 'course.json'));
  const mediaDir = path.join(root, 'public', 'course-media', slug);
  const videoBaseUrl = (course.videoBaseUrl || `/course-media/${slug}`).replace(/\/$/, '');
  const { videoBaseUrl: _ignored, ...courseFields } = course;
  const youtubeFile = path.join(courseDir, 'youtube.json');
  const youtube = fs.existsSync(youtubeFile) ? readJson<Record<string, string>>(youtubeFile) : {};

  const input = {
    ...courseFields,
    modules: course.modules.map((module) => ({
      ...module,
      lessons: module.lessons.map((lessonSlug) =>
        loadLesson(path.join(courseDir, 'lessons', lessonSlug), lessonSlug, mediaDir, videoBaseUrl, youtube[lessonSlug]),
      ),
    })),
  };

  const parsed = courseInputSchema.safeParse(input);
  if (!parsed.success) {
    const details = parsed.error.issues
      .slice(0, 15)
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Course "${slug}" failed validation:\n${details}`);
  }
  return parsed.data;
}
