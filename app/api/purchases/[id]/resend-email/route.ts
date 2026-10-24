import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/config/auth';
import {
  ProductPurchaseError,
  resendPurchaseConfirmationEmail,
} from '@/lib/services/purchase';

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteProps) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await resendPurchaseConfirmationEmail(id);

    return NextResponse.json({ message: 'Email resent successfully' });
  } catch (error) {
    if (error instanceof ProductPurchaseError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('Resend email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
