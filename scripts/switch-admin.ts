/**
 * Replace one admin account with another, keeping everything the old one authored.
 *
 *   $env:MONGODB_URI = "<connection string>"
 *   npx tsx --tsconfig tsconfig.json scripts/switch-admin.ts --old admin@example.com --new you@example.com --name "Your Name"
 *   ...check the plan it prints, then run again with --apply
 *
 * The new password is asked for in a hidden prompt and never printed or stored in plain text.
 * The new account is created (or an existing one promoted) as a verified admin, posts, products,
 * projects, courses, course revisions, newsletters and comments move to it, and only then is the
 * old account deleted with its tokens and learner records.
 */
import readline from 'readline';
import bcrypt from 'bcryptjs';
import mongoose, { type Model } from 'mongoose';

import { User } from '@/lib/models/User';
import { Post } from '@/lib/models/Post';
import Product from '@/lib/models/Product';
import { Project } from '@/lib/models/Project';
import Course from '@/lib/models/Course';
import CourseRevision from '@/lib/models/CourseRevision';
import Newsletter from '@/lib/models/Newsletter';
import Comment from '@/lib/models/Comment';
import CourseEnrollment from '@/lib/models/CourseEnrollment';
import CourseQuizAttempt from '@/lib/models/CourseQuizAttempt';
import LearnerLessonState from '@/lib/models/LearnerLessonState';
import LearnerNotebookEntry from '@/lib/models/LearnerNotebookEntry';
import EmailVerificationToken from '@/lib/models/EmailVerificationToken';
import PasswordResetToken from '@/lib/models/PasswordResetToken';

function arg(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 ? process.argv[index + 1] : undefined;
}

const OLD = arg('old')?.trim().toLowerCase();
const NEW = arg('new')?.trim().toLowerCase();
const NAME = arg('name')?.trim();
const APPLY = process.argv.includes('--apply');
const URI = process.env.MONGODB_URI || process.env.MONGO_URI;

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

/**
 * Asks each question in turn on one reader, without echoing the answers in a terminal.
 * (A reader per question would lose piped lines: the first one buffers them all.)
 */
function askHidden(questions: string[]): Promise<string[]> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
    let current = '';
    if (process.stdin.isTTY) {
      const internal = rl as unknown as { _writeToOutput: (text: string) => void; output: NodeJS.WriteStream };
      internal._writeToOutput = (text: string) => {
        if (text.startsWith(current)) internal.output.write(current);
        else if (text === '\r\n' || text === '\n') internal.output.write('\n');
      };
    }
    const answers: string[] = [];
    const next = () => {
      if (answers.length === questions.length) {
        rl.close();
        resolve(answers);
        return;
      }
      current = questions[answers.length];
      rl.question(current, (answer) => {
        if (process.stdin.isTTY) process.stdout.write('\n');
        // Windows PowerShell pipes start with a byte-order mark and end lines with \r\n.
        answers.push(answer.replace(/^﻿/, '').replace(/\r$/, ''));
        next();
      });
    };
    next();
  });
}

function weakness(password: string, email: string) {
  if (password.length < 12) return 'it must be at least 12 characters';
  if (password.length > 72) return 'it must be at most 72 characters (bcrypt ignores the rest)';
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (classes < 3) return 'use at least three of: lowercase, uppercase, digits, symbols';
  const local = email.split('@')[0];
  if (local.length >= 4 && password.toLowerCase().includes(local)) return 'it must not contain your email name';
  if (/(.)\1{3,}/.test(password)) return 'it must not repeat one character four or more times';
  return null;
}

const AUTHORED: Array<[string, Model<any>, string]> = [
  ['posts', Post as Model<any>, 'author'],
  ['products', Product as Model<any>, 'author'],
  ['projects', Project as Model<any>, 'author'],
  ['courses', Course as Model<any>, 'author'],
  ['course revisions', CourseRevision as Model<any>, 'author'],
  ['newsletters', Newsletter as Model<any>, 'author'],
  ['comments', Comment as Model<any>, 'user'],
];
const OWNED_BY_OLD: Array<[string, Model<any>, string]> = [
  ['course enrollments', CourseEnrollment as Model<any>, 'user'],
  ['quiz attempts', CourseQuizAttempt as Model<any>, 'user'],
  ['lesson progress', LearnerLessonState as Model<any>, 'user'],
  ['notebook entries', LearnerNotebookEntry as Model<any>, 'user'],
  ['verification tokens', EmailVerificationToken as Model<any>, 'userId'],
  ['password reset tokens', PasswordResetToken as Model<any>, 'userId'],
];

async function main() {
  if (!URI) fail('Set MONGODB_URI (or MONGO_URI) in this PowerShell window first.');
  if (!OLD || !NEW) fail('Pass --old <email> and --new <email>.');
  if (OLD === NEW) fail('--old and --new are the same address.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(NEW)) fail(`"${NEW}" is not an email address.`);

  await mongoose.connect(URI, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db?.databaseName;
  console.log(`\nConnected to database "${db}".`);

  const oldUser = await User.findOne({ email: OLD });
  if (!oldUser) fail(`No account ${OLD}. Nothing to replace.`);
  if (oldUser.role !== 'admin') fail(`${OLD} is not an admin; refusing to touch it.`);
  const existingNew = await User.findOne({ email: NEW });

  console.log(`\nPlan${APPLY ? '' : ' (dry run: nothing is written)'}:`);
  console.log(`  • ${existingNew ? `Promote existing account ${NEW} (now ${existingNew.role}) to` : `Create ${NEW} as`} a verified admin with a new password`);
  for (const [label, model, field] of AUTHORED) {
    const count = await model.countDocuments({ [field]: oldUser._id });
    if (count) console.log(`  • Move ${count} ${label} from ${OLD} to ${NEW}`);
  }
  for (const [label, model, field] of OWNED_BY_OLD) {
    const count = await model.countDocuments({ [field]: oldUser._id });
    if (count) console.log(`  • Delete ${count} ${label} belonging to ${OLD}`);
  }
  console.log(`  • Delete the account ${OLD}`);

  if (!APPLY) {
    console.log('\nRun the same command again with --apply to do this.\n');
    await mongoose.disconnect();
    return;
  }

  const [password, again] = await askHidden([`\nNew password for ${NEW}: `, 'Type it again: ']);
  const problem = weakness(password, NEW);
  if (problem) fail(`Password rejected: ${problem}.`);
  if (again !== password) fail('The two passwords did not match. Nothing was changed.');
  const hash = await bcrypt.hash(password, 12);

  // 1. The new admin exists before anything is moved or deleted.
  let newUser = existingNew;
  if (newUser) {
    newUser.role = 'admin';
    newUser.password = hash;
    newUser.emailVerified = newUser.emailVerified || new Date();
    newUser.tokenVersion = (newUser.tokenVersion || 0) + 1; // signs out any session on the old password
    if (NAME) newUser.name = NAME;
    await newUser.save();
  } else {
    newUser = await User.create({ name: NAME || oldUser.name || 'Admin', email: NEW, password: hash, role: 'admin', emailVerified: new Date() });
  }
  console.log(`\n✓ ${NEW} is a verified admin.`);

  // 2. Move authored content.
  for (const [label, model, field] of AUTHORED) {
    const result = await model.updateMany({ [field]: oldUser._id }, { $set: { [field]: newUser._id } });
    if (result.modifiedCount) console.log(`✓ Moved ${result.modifiedCount} ${label}.`);
  }
  await Comment.updateMany({ user: newUser._id }, { $set: { authorName: newUser.name } });

  // 3. Remove the old account and what only it used.
  for (const [label, model, field] of OWNED_BY_OLD) {
    const result = await model.deleteMany({ [field]: oldUser._id });
    if (result.deletedCount) console.log(`✓ Deleted ${result.deletedCount} ${label}.`);
  }
  const leftover = await Promise.all(AUTHORED.map(([, model, field]) => model.countDocuments({ [field]: oldUser._id })));
  if (leftover.some(Boolean)) fail(`Some content still points at ${OLD}; the account was NOT deleted. Run again.`);
  await User.deleteOne({ _id: oldUser._id });
  console.log(`✓ Deleted ${OLD}.`);

  console.log(`\nDone. Sign in at /login with ${NEW}. Sessions of ${OLD} stop working at once.\n`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('\n✗ Failed:', error instanceof Error ? error.message : error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
