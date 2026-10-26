import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import { productSchema } from '@/lib/utils/validation';
import { AdminAccessError, getOptionalAdminSession, requireAdminSession } from '@/lib/auth/admin';

const publicProductFields = [
  '_id', 'title', 'slug', 'shortDescription', 'price', 'currency',
  'productType', 'category', 'tags', 'thumbnailImage', 'licenseType',
  'featured', 'createdAt', 'updatedAt',
].join(' ');

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const publishedOnly = searchParams.get('published') === 'true';
    const isAdmin = Boolean(await getOptionalAdminSession());

    const query: any = {};
    if (category) query.category = category;
    if (!isAdmin || publishedOnly) query.published = true;

    const productQuery = Product.find(query).sort({ createdAt: -1 });
    if (!isAdmin) productQuery.select(publicProductFields);
    const products = await productQuery.lean();

    return NextResponse.json(products);
  } catch (error) {
    console.error('Fetch products error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminSession();

    const body = await req.json().catch(() => null);
    const validationResult = productSchema.safeParse(body);

    if (!validationResult.success) {
      // console.log(validationResult.error.errors);
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    await dbConnect();

    const product = await Product.create({
      ...data,
      author: session.user.id,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('Create product error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
