import type { Metadata } from 'next';

import ProjectGrid from '@/app/(public)/portfolio/ProjectGridClient';
import { Container, Section } from '@/components/ui/Section';
import { connectDB } from '@/lib/db/connection';
import { IProject, Project } from '@/lib/models/Project';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Case studies for applied AI, machine learning, and full-stack product systems.',
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
            <p className="text-eyebrow text-primary">§ Builds</p>
            <h1 className="mt-3 text-title">Machine learning projects, built and shipped.</h1>
            <p className="mt-5 max-w-2xl text-[17px] leading-[1.6] text-muted-foreground sm:text-lg">
              End-to-end projects: trained, deployed to the cloud and running.
            </p>
            <p className="mt-6 font-mono text-[12px] tracking-[0.06em] text-muted-foreground">
              {serializedProjects.length} BUILDS · {featuredCount} FEATURED · {categories.length} CATEGORIES
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
              <h2 className="text-xl font-medium">Projects are being added</h2>
              <p className="mt-2 text-sm text-muted-foreground">Published projects will appear here automatically.</p>
            </div>
          )}
        </Container>
      </Section>
    </div>
  );
}
