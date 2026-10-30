import type { Metadata } from 'next';

import ProjectGrid from '@/app/(public)/portfolio/ProjectGridClient';
import { Container, Section } from '@/components/ui/Section';
import { connectDB } from '@/lib/db/connection';
import { IProject, Project } from '@/lib/models/Project';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Projects',
  alternates: { canonical: '/projects' },
  description: 'Real AI and machine learning projects I have built, with simple write-ups of what each one does and how it works.',
};

export default async function ProjectsPage() {
  let projects: IProject[] = [];
  try {
    await connectDB();
    projects = await Project.find({ published: true })
      .sort({ featured: -1, createdAt: -1 })
      .lean() as unknown as IProject[];
  } catch (error) {
    console.error('Failed to load public projects', error);
  }

  const serializedProjects = projects.map((project) => ({
    ...project,
    _id: project._id.toString(),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    author: project.author?.toString() || '',
    githubStats: project.githubStats ? {
      ...project.githubStats,
      lastUpdated: project.githubStats.lastUpdated?.toISOString() || null,
      cachedAt: project.githubStats.cachedAt?.toISOString() || null,
    } : null,
  }));

  const featuredCount = serializedProjects.filter((project) => project.featured).length;
  const categories = Array.from(new Set(serializedProjects.map((project) => project.category))).filter(Boolean);

  return (
    <div className="min-h-screen">
      <Section className="border-b border-border pb-12 pt-12 md:pb-16 md:pt-16">
        <Container>
          <div className="max-w-3xl">
            <p className="text-eyebrow text-primary">Projects</p>
            <h1 className="mt-3 text-title">Things I&apos;ve built with AI.</h1>
            <p className="mt-5 max-w-2xl text-[17px] leading-[1.6] text-muted-foreground sm:text-lg">
              Real apps and tools that use AI. Each one says what it does, how it works and what I learned.
            </p>
            <p className="mt-6 font-mono text-[12px] tracking-[0.06em] text-muted-foreground">
              {serializedProjects.length} PROJECTS · {featuredCount} FEATURED · {categories.length} TOPICS
            </p>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          {serializedProjects.length > 0 ? (
            <ProjectGrid initialProjects={serializedProjects} />
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
              <h2 className="text-xl font-medium">New projects are on their way</h2>
              <p className="mt-2 text-sm text-muted-foreground">They will show up here soon.</p>
            </div>
          )}
        </Container>
      </Section>
    </div>
  );
}
