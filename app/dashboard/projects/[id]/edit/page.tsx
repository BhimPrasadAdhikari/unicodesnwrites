import React from 'react';
import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/db/connection';
import { Project } from '@/lib/models/Project';
import ProjectEditor from '@/components/cms/ProjectEditor';
import { isValidObjectId } from 'mongoose';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';

interface EditProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  await connectDB();

  const project = await Project.findById(id).lean();

  if (!project) {
    notFound();
  }

  const serializedProject = JSON.parse(JSON.stringify(project));

  return (
    <div className="mx-auto max-w-5xl pb-16">
      <DashboardPageHeader eyebrow="Project desk" title={`Edit ${project.title}`} description="Refine the public case study, technical context, imagery, and publication status." />
      <ProjectEditor initialData={serializedProject} isEditing />
    </div>
  );
}
