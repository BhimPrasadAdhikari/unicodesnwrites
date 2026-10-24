import React from 'react';
import ProjectEditor from '@/components/cms/ProjectEditor';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-5xl pb-16">
      <DashboardPageHeader eyebrow="Project desk" title="New project" description="Turn shipped work into a clear case study with context, decisions, evidence, and links." />
      <ProjectEditor />
    </div>
  );
}
