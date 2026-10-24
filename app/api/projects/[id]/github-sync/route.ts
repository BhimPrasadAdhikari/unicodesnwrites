import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import { Project } from '@/lib/models/Project';
import { fetchGitHubStats } from '@/lib/services/github';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();

    await connectDB();
    const { id } = await params;

    const project = await Project.findById(id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.githubUrl) {
      return NextResponse.json({ error: 'Project does not have a GitHub URL' }, { status: 400 });
    }

    const stats = await fetchGitHubStats(project.githubUrl);

    if (!stats) {
      return NextResponse.json({ error: 'Failed to fetch GitHub stats' }, { status: 502 });
    }

    // Update project with new stats
    project.githubStats = {
      ...stats,
      cachedAt: new Date()
    };
    
    // Also update main language if not manually set (optional, based on your logic)
    // if (!project.language) project.language = stats.language;

    await project.save();

    return NextResponse.json({ 
      message: 'GitHub stats updated', 
      stats: project.githubStats 
    });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('Error syncing GitHub stats:', error);
    return NextResponse.json({ error: 'Failed to sync GitHub stats' }, { status: 500 });
  }
}
