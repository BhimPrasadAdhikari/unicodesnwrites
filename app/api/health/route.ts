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
    console.error('Health check failed:', error);
    return NextResponse.json({ 
      status: 'error', 
      database: 'disconnected',
    }, { status: 500 });
  }
}
