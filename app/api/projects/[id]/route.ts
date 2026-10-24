import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import { Project } from '@/lib/models/Project';
import { projectSchema } from '@/lib/utils/validations/project';
import { AdminAccessError, getOptionalAdminSession, requireAdminSession } from '@/lib/auth/admin';

// Helper to get project by ID or Slug
async function getProject(id: string) {
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
  if (isObjectId) {
    return await Project.findById(id);
  } else {
    return await Project.findOne({ slug: id });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const isAdmin = Boolean(await getOptionalAdminSession());

    const project = isAdmin
      ? await getProject(id)
      : await Project.findOne(
          /^[0-9a-fA-F]{24}$/.test(id)
            ? { _id: id, published: true }
            : { slug: id, published: true }
        )
          .select('-author')
          .lean();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Optional: Increment views here or in a separate action
    // project.views += 1;
    // await project.save();

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();

    await connectDB();
    const { id } = await params;
    if (!/^[a-f\d]{24}$/i.test(id)) return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });

    const body = await req.json().catch(() => null);

    // Validate update
    const validation = projectSchema.partial().safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten() }, { status: 400 });
    }

    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { ...validation.data },
      { new: true, runValidators: true }
    );

    if (!updatedProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(updatedProject);
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();

    await connectDB();
    const { id } = await params;
    if (!/^[a-f\d]{24}$/i.test(id)) return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });

    const deletedProject = await Project.findByIdAndDelete(id);

    if (!deletedProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
