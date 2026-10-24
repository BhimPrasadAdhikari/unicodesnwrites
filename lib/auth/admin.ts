import { getServerSession } from 'next-auth';
import { Session } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/config/auth';

export class AdminAccessError extends Error {
  statusCode: number;

  constructor(message = 'Unauthorized', statusCode = 401) {
    super(message);
    this.name = 'AdminAccessError';
    this.statusCode = statusCode;
  }
}

export async function requireAdminSession(): Promise<Session> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.sessionValid || session.user?.role !== 'admin') {
    throw new AdminAccessError();
  }

  return session;
}

export async function getOptionalAdminSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.sessionValid && session.user.role === 'admin' ? session : null;
}

export async function requireAdminResponse(): Promise<NextResponse | null> {
  try {
    await requireAdminSession();
    return null;
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    throw error;
  }
}

export function adminUnauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
