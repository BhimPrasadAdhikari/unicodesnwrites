import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import Purchase from '@/lib/models/Purchase';
import { productSchema } from '@/lib/utils/validation';
import { onlySentFields } from '@/lib/utils/validations/patch';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';

interface RouteProps {
  params: Promise<{ id: string }>;
}

const isObjectId = (value: string) => /^[a-f\d]{24}$/i.test(value);

export async function GET(req: NextRequest, { params }: RouteProps) {
  try {
    await requireAdminSession();
    await dbConnect();
    const { id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    const product = await Product.findById(id).select('+fileUrl');

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteProps) {
  try {
    await requireAdminSession();

    const body = await req.json().catch(() => null);
    const validationResult = productSchema.partial().safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    await dbConnect();

    const { id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    const existingProduct = await Product.findById(id);

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const sent = onlySentFields(validationResult.data, body);
    const updateData: Record<string, unknown> = { ...sent };

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteProps) {
  try {
    await requireAdminSession();

    await dbConnect();
    const { id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    const product = await Product.findById(id);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const completedPurchases = await Purchase.exists({ product: product._id, status: 'completed' });
    if (completedPurchases) {
      return NextResponse.json(
        { error: 'Products with completed purchases cannot be deleted. Unpublish the product instead.' },
        { status: 409 }
      );
    }

    await product.deleteOne();

    return NextResponse.json({ message: 'Product deleted' });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
