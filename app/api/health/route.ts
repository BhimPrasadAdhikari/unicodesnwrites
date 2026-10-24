import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';

export async function GET() {
  try {
    await connectDB();
    return NextResponse.json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    return NextResponse.json({ 
      status: 'error', 
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
