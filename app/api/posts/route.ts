import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import { Post, IPost } from '@/lib/models/Post';
import mongoose from 'mongoose';
import { postSchema } from '@/lib/utils/validations/post';
import { calculateReadingTime } from '@/lib/utils/slug';
import { AdminAccessError, getOptionalAdminSession, requireAdminSession } from '@/lib/auth/admin';
import { livePostFilter } from '@/lib/utils/post-visibility';

// GET - List all posts (with filters)
export async function GET(request: NextRequest) {
  try {
    const isAdmin = Boolean(await getOptionalAdminSession());

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(searchParams.get('limit') || '10', 10) || 10));
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');
    const search = searchParams.get('search') || searchParams.get('q');
    const publishedParam = searchParams.get('published');

    const query: any = {};

    if (category) query.category = category;
    if (tag) query.tags = tag;
    
    // Security: Enforce published=true for non-admins
    if (!isAdmin) {
      Object.assign(query, livePostFilter());
    } else {
      // Trashed posts stay out of admin lists too; they live on the dashboard's Trash tab.
      query.trashedAt = null;
      // Admin can filter. If param is provided, use it.
      if (publishedParam !== null) {
        query.published = publishedParam === 'true';
      }
      // If admin and no param, return all (default behavior)
    }

    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query.$or = [
        { title: regex },
        { excerpt: regex },
        { tags: regex },
      ];
    }

    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      Post.find(query)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', isAdmin ? 'name email' : 'name')
        .lean(),
      Post.countDocuments(query),
    ]);

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

// POST - Create new post
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await request.json().catch(() => null);
    const validatedData = postSchema.parse(body);

    await connectDB();

    // Check if slug already exists
    const existingPost = await Post.findOne({ slug: validatedData.slug });
    if (existingPost) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    }

    // Calculate reading time
    const readingTime = calculateReadingTime(validatedData.content);

    // Handle series linkage properly
    const { seriesId, seriesPart, publishedAt: requestedPublishedAt, ...otherData } = validatedData;
    const postData: any = {
      ...otherData,
      author: session.user.id,
      readingTime,
      publishedAt: requestedPublishedAt
        ? new Date(requestedPublishedAt)
        : validatedData.published ? new Date() : undefined,
    };

    if (seriesId && seriesId.trim() !== '') {
      postData.seriesId = new mongoose.Types.ObjectId(seriesId);
      if (seriesPart !== undefined) {
        postData.seriesPart = seriesPart;
      }
    }

    const post = await Post.create(postData);

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('Error creating post:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      // @ts-expect-error: Mongoose create accepts permissive types that TS might flag (e.g. string for ObjectId)
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
