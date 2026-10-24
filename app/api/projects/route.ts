import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import { Project } from '@/lib/models/Project';
import { projectSchema } from '@/lib/utils/validations/project';
import { generateSlug } from '@/lib/utils/slug';
import { AdminAccessError, getOptionalAdminSession, requireAdminSession } from '@/lib/auth/admin';

export async function GET(req: NextRequest) {
  try {
    const isAdmin = Boolean(await getOptionalAdminSession());

    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const featured = searchParams.get('featured') === 'true';
    const publishedParam = searchParams.get('published');
    const category = searchParams.get('category');
    const tech = searchParams.get('tech');
    
    const query: any = {};
    if (featured) query.featured = true;
    if (category) query.category = category;
    if (tech) query.techStack = tech;

    // Security: Enforce published=true for non-admins
    if (!isAdmin) {
      query.published = true;
    } else {
      // Admin can filter. If param is provided, use it.
      if (publishedParam === 'true') query.published = true;
      else if (publishedParam === 'false') query.published = false;
      // If admin and no param, return all
    }

    const projectQuery = Project.find(query).sort({ featured: -1, createdAt: -1 });
    if (!isAdmin) projectQuery.select('-author');
    const projects = await projectQuery.lean();

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminSession();

    await connectDB();
    const body = await req.json().catch(() => null);

    // 1. Zod Validation
    const validation = projectSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten() }, { status: 400 });
    }

    const data = validation.data;

    // 2. Slug Generation (if not provided or check uniqueness)
    const slug = data.slug || generateSlug(data.title);
    
    // Check if slug exists
    const existingProject = await Project.findOne({ slug });
    if (existingProject) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }

    // 3. Create Project
    const newProject = await Project.create({
      ...data,
      slug,
      author: session.user.id,
    });

    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
