import React from 'react';
import Link from 'next/link';
import { connectDB } from '@/lib/db/connection';
import { Project } from '@/lib/models/Project';
import ProjectList from '@/components/cms/ProjectList';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await connectDB();
  
  const { q } = await searchParams;
  const query: any = {};
  
  if (q) {
    query.title = { $regex: q.slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }

  const projects = await Project.find(query)
    .sort({ createdAt: -1 })
    .lean(); // Use lean for performance since we just pass serializable data

  // Convert ObjectId to string for client component props
  const sanitizedProjects = projects.map((p: any) => ({
    ...p,
    _id: p._id.toString(),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    author: p.author?.toString() || '',
  }));

  return (
    <div>
      <DashboardPageHeader
        eyebrow="Portfolio & Systems"
        title="Projects"
        description="Showcase deployed AI/ML systems, architecture breakdowns, live demos, and case studies."
        action={
          <Link href="/dashboard/projects/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/90">
            <Plus className="h-4 w-4" /> New project
          </Link>
        }
      />

      <ProjectList projects={sanitizedProjects} />
    </div>
  );
}
