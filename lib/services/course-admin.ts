import { isValidObjectId } from 'mongoose';

import { connectDB } from '@/lib/db/connection';
import Course from '@/lib/models/Course';
import CourseRevision from '@/lib/models/CourseRevision';
import {
  courseInputSchema,
  normalizeLegacyCourse,
  type CourseInput,
} from '@/lib/utils/validations/course';

export type CourseSaveReason = 'autosave' | 'manual' | 'publish' | 'restore';

export class CourseVersionConflictError extends Error {
  currentRevision: number;

  constructor(currentRevision: number) {
    super('This course changed in another session. Reload before saving again.');
    this.name = 'CourseVersionConflictError';
    this.currentRevision = currentRevision;
  }
}

type CourseSnapshotSource = CourseInput & {
  revision?: number;
  publishedAt?: Date;
};

// The stored document is validated before it is preserved as a revision, so
// retired lesson types (e.g. "visual-intuition") must be mapped first or the
// save fails on data the author never touched.
function toCourseSnapshot(stored: CourseSnapshotSource): CourseInput {
  const course = normalizeLegacyCourse(stored);
  return courseInputSchema.parse({
    title: course.title,
    slug: course.slug,
    eyebrow: course.eyebrow,
    summary: course.summary,
    description: course.description,
    topic: course.topic,
    level: course.level,
    coverImage: course.coverImage,
    tags: course.tags,
    prerequisites: course.prerequisites,
    learningOutcomes: course.learningOutcomes,
    audience: course.audience,
    instructorName: course.instructorName,
    featured: course.featured,
    status: course.status,
    modules: course.modules.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) => ({ ...lesson })),
    })),
  });
}

async function preserveRevision(
  courseId: string,
  revision: number,
  snapshot: CourseInput,
  authorId: string,
  reason: CourseSaveReason,
  restoredFromRevision?: number,
) {
  await CourseRevision.updateOne(
    { course: courseId, revision },
    {
      $setOnInsert: {
        course: courseId,
        revision,
        snapshot,
        author: authorId,
        reason,
        restoredFromRevision,
      },
    },
    { upsert: true },
  );
}

export async function updateCourseVersioned(options: {
  courseId: string;
  input: CourseInput;
  expectedRevision: number;
  authorId: string;
  reason: Exclude<CourseSaveReason, 'restore'>;
}) {
  await connectDB();
  const existing = await Course.findById(options.courseId).lean();
  if (!existing) return null;

  const currentRevision = existing.revision || 1;
  if (currentRevision !== options.expectedRevision) {
    throw new CourseVersionConflictError(currentRevision);
  }

  await preserveRevision(
    options.courseId,
    currentRevision,
    toCourseSnapshot(existing as unknown as CourseSnapshotSource),
    options.authorId,
    options.reason,
  );

  const revisionMatch = existing.revision
    ? { revision: currentRevision }
    : { $or: [{ revision: currentRevision }, { revision: { $exists: false } }] };
  const publishedAt =
    options.input.status === 'published'
      ? existing.publishedAt || new Date()
      : existing.publishedAt;
  const course = await Course.findOneAndUpdate(
    { _id: options.courseId, ...revisionMatch },
    {
      $set: {
        ...options.input,
        revision: currentRevision + 1,
        publishedAt,
      },
    },
    { new: true, runValidators: true },
  );

  if (!course) {
    const latest = await Course.findById(options.courseId).select('revision').lean();
    throw new CourseVersionConflictError(latest?.revision || currentRevision + 1);
  }
  return course;
}

export async function listCourseVersions(courseId: string) {
  if (!isValidObjectId(courseId)) return null;
  await connectDB();
  const course = await Course.findById(courseId).select('revision updatedAt').lean();
  if (!course) return null;
  const versions = await CourseRevision.find({ course: courseId })
    .select('revision reason restoredFromRevision author createdAt')
    .sort({ revision: -1 })
    .limit(50)
    .populate('author', 'name email')
    .lean();
  return {
    currentRevision: course.revision || 1,
    updatedAt: course.updatedAt.toISOString(),
    versions: versions.map((version) => ({
      id: version._id.toString(),
      revision: version.revision,
      reason: version.reason,
      restoredFromRevision: version.restoredFromRevision || null,
      author: version.author,
      createdAt: version.createdAt.toISOString(),
    })),
  };
}

export async function restoreCourseVersion(options: {
  courseId: string;
  revision: number;
  expectedRevision: number;
  authorId: string;
}) {
  await connectDB();
  const [existing, target] = await Promise.all([
    Course.findById(options.courseId).lean(),
    CourseRevision.findOne({ course: options.courseId, revision: options.revision }).lean(),
  ]);
  if (!existing || !target) return null;
  const currentRevision = existing.revision || 1;
  if (currentRevision !== options.expectedRevision) {
    throw new CourseVersionConflictError(currentRevision);
  }

  const input = courseInputSchema.parse(normalizeLegacyCourse(target.snapshot as CourseSnapshotSource));
  const duplicate = await Course.exists({ slug: input.slug, _id: { $ne: options.courseId } });
  if (duplicate) throw new Error('The restored slug is now used by another course.');

  await preserveRevision(
    options.courseId,
    currentRevision,
    toCourseSnapshot(existing as unknown as CourseSnapshotSource),
    options.authorId,
    'restore',
    options.revision,
  );

  const revisionMatch = existing.revision
    ? { revision: currentRevision }
    : { $or: [{ revision: currentRevision }, { revision: { $exists: false } }] };
  const course = await Course.findOneAndUpdate(
    { _id: options.courseId, ...revisionMatch },
    {
      $set: {
        ...input,
        revision: currentRevision + 1,
        publishedAt:
          input.status === 'published' ? existing.publishedAt || new Date() : existing.publishedAt,
      },
    },
    { new: true, runValidators: true },
  );
  if (!course) throw new CourseVersionConflictError(currentRevision + 1);
  return course;
}
