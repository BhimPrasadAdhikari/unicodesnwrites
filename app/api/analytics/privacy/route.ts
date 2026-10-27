import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import { Analytics } from '@/lib/models/Analytics';
import { Session } from '@/lib/models/Session';
import { consumeRateLimit, getClientAddress } from '@/lib/auth/security';

// Anyone holding a session ID can read or erase that session, so cap how often one address can try.
async function limited(request: NextRequest) {
  const limit = await consumeRateLimit({ scope: 'analytics-privacy', identifier: getClientAddress(request), limit: 20, windowSeconds: 60 * 60 });
  return limit.allowed ? null : NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId || sessionId.length > 128) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }
    const tooMany = await limited(request);
    if (tooMany) return tooMany;
    
    await connectDB();
    
    const session = await Session.findOne({ sessionId }).select('-_id -__v -ipHash').lean();
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    const events = await Analytics.find({ sessionId }).lean();
    
    return NextResponse.json({
      session,
      events,
      message: 'This is all the data we have associated with your session ID.'
    });
    
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId || sessionId.length > 128) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }
    const tooMany = await limited(request);
    if (tooMany) return tooMany;
    
    await connectDB();
    
    const session = await Session.findOne({ sessionId });
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    // Delete all data
    await Session.deleteOne({ sessionId });
    await Analytics.deleteMany({ sessionId });
    
    return NextResponse.json({ message: 'All data associated with this session has been permanently deleted.' });
    
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
