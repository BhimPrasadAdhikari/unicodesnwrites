import { NextRequest, NextResponse } from 'next/server';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { isObjectId } from '@/lib/utils/object-id';
import {
  ProductPurchaseError,
  resendPurchaseConfirmationEmail,
} from '@/lib/services/purchase';

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteProps) {
  try {
    await requireAdminSession();

    const { id } = await params;
    if (!isObjectId(id)) {
      return NextResponse.json({ error: 'Invalid purchase ID' }, { status: 400 });
    }
    await resendPurchaseConfirmationEmail(id);

    return NextResponse.json({ message: 'Email resent successfully' });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ProductPurchaseError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('Resend email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
