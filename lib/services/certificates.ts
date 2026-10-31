import crypto from 'crypto';
import { Types } from 'mongoose';

import { connectDB } from '@/lib/db/connection';
import Certificate from '@/lib/models/Certificate';
import Course from '@/lib/models/Course';
import CourseEnrollment from '@/lib/models/CourseEnrollment';
import CourseQuizAttempt from '@/lib/models/CourseQuizAttempt';
import { User } from '@/lib/models/User';
import {
  CERTIFICATE_CODE_ALPHABET,
  CERTIFICATE_CODE_LENGTH,
  isCertificateCode,
  type LearnerCertificate,
} from '@/lib/utils/certificate';
import { isObjectId } from '@/lib/utils/object-id';

/** A random public code. 256 is a multiple of the 32-letter alphabet, so every letter is equally likely. */
export function generateCertificateCode() {
  return Array.from(crypto.randomBytes(CERTIFICATE_CODE_LENGTH), (byte) => CERTIFICATE_CODE_ALPHABET[byte % CERTIFICATE_CODE_ALPHABET.length]).join('');
}

const isDuplicateKeyError = (error: unknown) =>
  typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;

/**
 * Issues the certificate for a completed enrollment, or returns the one already issued.
 * Safe to call any number of times: one certificate per learner per course.
 * Returns null when the enrollment isn't completed.
 */
export async function issueCertificate(userId: string, courseId: string) {
  if (!isObjectId(userId) || !isObjectId(courseId)) return null;
  await connectDB();
  const existing = await Certificate.findOne({ user: userId, course: courseId }).lean();
  if (existing) return existing;

  const enrollment = await CourseEnrollment.findOne({ user: userId, course: courseId, status: 'completed' }).select('_id completedAt').lean();
  if (!enrollment) return null;

  const [user, course, quizRows] = await Promise.all([
    User.findById(userId).select('name').lean(),
    Course.findById(courseId).select('title').lean(),
    CourseQuizAttempt.aggregate<{ average: number }>([
      { $match: { user: new Types.ObjectId(userId), course: new Types.ObjectId(courseId) } },
      { $group: { _id: null, average: { $avg: '$score' } } },
    ]),
  ]);
  if (!user || !course) return null;

  const average = quizRows[0]?.average;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await Certificate.findOneAndUpdate(
        { user: user._id, course: course._id },
        {
          $setOnInsert: {
            enrollment: enrollment._id,
            code: generateCertificateCode(),
            learnerName: (user.name || 'Learner').slice(0, 120),
            courseTitle: course.title.slice(0, 200),
            completedAt: enrollment.completedAt || new Date(),
            issuedAt: new Date(),
            ...(typeof average === 'number' ? { averageQuizScore: Math.round(average) } : {}),
          },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      ).lean();
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      // Another request issued it first, or the random code was taken: check, then try a new code.
      const raced = await Certificate.findOne({ user: user._id, course: course._id }).lean();
      if (raced) return raced;
    }
  }
  throw new Error('Could not pick a unique certificate code.');
}

/** Like issueCertificate, but never throws: a certificate problem must not break progress or a page. */
export async function issueCertificateQuietly(userId: string, courseId: string) {
  try {
    return await issueCertificate(userId, courseId);
  } catch (error) {
    console.error('Certificate issue failed:', error instanceof Error ? error.message : 'unknown error');
    return null;
  }
}

type PopulatedCourse = { _id: Types.ObjectId; slug?: string; status?: string } | null;

/** The certificate anyone can see at /certificates/<code>; null when unknown, hidden or revoked. */
export async function getPublicCertificate(code: string) {
  if (!isCertificateCode(code)) return null;
  await connectDB();
  const certificate = await Certificate.findOne({ code, hidden: { $ne: true }, revokedAt: null })
    .select('code learnerName displayName courseTitle completedAt issuedAt averageQuizScore course')
    .populate('course', 'slug status')
    .lean();
  if (!certificate) return null;
  const course = certificate.course as unknown as PopulatedCourse;
  return {
    code: certificate.code,
    name: certificate.displayName || certificate.learnerName,
    courseTitle: certificate.courseTitle,
    courseSlug: course?.status === 'published' && course.slug ? course.slug : null,
    completedAt: certificate.completedAt.toISOString(),
    issuedAt: (certificate.issuedAt || certificate.completedAt).toISOString(),
    averageQuizScore: typeof certificate.averageQuizScore === 'number' ? certificate.averageQuizScore : null,
  };
}

function toLearnerCertificate(certificate: {
  _id: Types.ObjectId; code: string; courseTitle: string; course: unknown; learnerName: string; displayName?: string; completedAt: Date; hidden?: boolean;
}): LearnerCertificate {
  const course = certificate.course as PopulatedCourse;
  return {
    id: certificate._id.toString(),
    code: certificate.code,
    courseTitle: certificate.courseTitle,
    courseSlug: course?.slug || null,
    name: certificate.displayName || certificate.learnerName,
    learnerName: certificate.learnerName,
    displayName: certificate.displayName || '',
    completedAt: certificate.completedAt.toISOString(),
    hidden: Boolean(certificate.hidden),
  };
}

/**
 * The learner's certificates (not revoked), newest first. Completed courses that have no
 * certificate yet (finished before certificates existed) get one issued here.
 */
export async function listLearnerCertificates(userId: string): Promise<LearnerCertificate[]> {
  if (!isObjectId(userId)) return [];
  await connectDB();
  const [completedCourseIds, issuedCourseIds] = await Promise.all([
    CourseEnrollment.distinct('course', { user: userId, status: 'completed' }),
    Certificate.distinct('course', { user: userId }),
  ]);
  const issued = new Set(issuedCourseIds.map(String));
  const missing = completedCourseIds.map(String).filter((courseId) => !issued.has(courseId)).slice(0, 20);
  if (missing.length) await Promise.all(missing.map((courseId) => issueCertificateQuietly(userId, courseId)));

  const certificates = await Certificate.find({ user: userId, revokedAt: null })
    .select('code courseTitle course learnerName displayName completedAt hidden')
    .populate('course', 'slug')
    .sort({ completedAt: -1 })
    .lean();
  return certificates.map(toLearnerCertificate);
}

/** The learner's certificate for one course, issuing it if they finished before certificates existed. */
export async function getLearnerCertificate(userId: string, courseId: string): Promise<LearnerCertificate | null> {
  const issued = await issueCertificateQuietly(userId, courseId);
  if (!issued || issued.revokedAt) return null;
  return toLearnerCertificate({ ...issued, course: null });
}

/** Learner privacy controls. Scoped to the owner; revoked certificates can't be changed. */
export async function updateLearnerCertificate(userId: string, certificateId: string, changes: { displayName?: string; hidden?: boolean }) {
  if (!isObjectId(userId) || !isObjectId(certificateId)) return null;
  await connectDB();
  const $set: Record<string, unknown> = {};
  if (changes.displayName !== undefined) $set.displayName = changes.displayName;
  if (changes.hidden !== undefined) $set.hidden = changes.hidden;
  const updated = await Certificate.findOneAndUpdate({ _id: certificateId, user: userId, revokedAt: null }, { $set }, { returnDocument: 'after' })
    .select('code courseTitle course learnerName displayName completedAt hidden')
    .populate('course', 'slug')
    .lean();
  return updated ? toLearnerCertificate(updated) : null;
}

/** Admin: revoke or restore. Revoked certificates show "not found" to everyone. */
export async function setCertificateRevoked(certificateId: string, revoked: boolean) {
  if (!isObjectId(certificateId)) return null;
  await connectDB();
  return Certificate.findByIdAndUpdate(certificateId, { $set: { revokedAt: revoked ? new Date() : null } }, { returnDocument: 'after' }).select('code revokedAt').lean();
}
