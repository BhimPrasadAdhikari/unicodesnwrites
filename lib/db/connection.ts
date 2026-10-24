import mongoose from 'mongoose';
import { env } from '@/lib/utils/env';

const MONGODB_URI = env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI in .env.local');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {

  var mongoose: MongooseCache;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (process.env.CODEX_PROJECT_SANDBOX === '1' && process.env.ALLOW_SANDBOX_DB !== '1') {
    throw new Error('Database access is disabled in the agent sandbox. Set ALLOW_SANDBOX_DB=1 only for an approved local or test database.');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: true,
      // Give Atlas SSL connections enough time (30s) when ALLOW_SANDBOX_DB=1 is set
      serverSelectionTimeoutMS: process.env.ALLOW_SANDBOX_DB === '1' ? 30000 : (process.env.CODEX_PROJECT_SANDBOX === '1' ? 1500 : 30000),
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
