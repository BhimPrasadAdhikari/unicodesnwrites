import React from 'react';
import AnalyticsTracker from '@/components/analytics/AnalyticsTracker';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/db/connection';
import { Project, IProject } from '@/lib/models/Project';
import TechStackBadges from '@/components/public/TechStackBadges';
import ProjectGallery from '@/components/public/ProjectGallery';
import MermaidDiagram from '@/components/ui/MermaidDiagram';
import { preserveSpacing } from '@/lib/utils/markdown';
import ReactMarkdown from 'react-markdown';
import 'katex/dist/katex.min.css';
import { rehypePlugins, remarkPlugins } from '@/lib/markdown-plugins';
import remarkBreaks from 'remark-breaks';
import { ExternalLink, Github, Eye, AlertTriangle, Lightbulb, GitFork, Star, Code2 } from 'lucide-react';

import { Button } from "@/components/ui/Button";
import { SiteIconCell } from "@/components/ui/SiteIcon";
import { Section, Container } from "@/components/ui/Section";

// Add styles for highlighting
import 'highlight.js/styles/github-dark.css';

interface ProjectDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProjectDetailPageProps) {
  await connectDB();
  const { slug } = await params;
  const project = await Project.findOne({ slug, published: true });
  
  if (!project) return { title: 'Project not found' };

  return {
    title: project.title,
    description: project.shortDescription,
    openGraph: { title: project.title, description: project.shortDescription, images: project.images?.[0] ? [project.images[0]] : undefined },
    alternates: { canonical: `/projects/${project.slug}` },
  };
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  await connectDB();
  const { slug } = await params;
  
  const project = await Project.findOne({ slug, published: true }).lean();

  if (!project) notFound();

  // Type assertion for simplicity with lean()
  const p = project as unknown as IProject;

  return (
    <div className="bg-background min-h-screen pb-20">
      <AnalyticsTracker 
        event="project_view" 
        metadata={{ 
          projectId: p._id.toString(), 
          title: p.title 
        }} 
      />

      {/* Hero Section */}
      <Section className="border-b border-border pb-12 pt-10 md:pb-16 md:pt-14">
         <Container>
            <nav aria-label="Breadcrumb" className="mb-6 font-mono text-[12px] tracking-[0.06em] text-muted-foreground">
               <Link href="/projects" className="inline-flex min-h-11 items-center hover:text-foreground">PROJECTS</Link>
               <span aria-hidden="true"> / </span>
               <span className="uppercase">{p.category}</span>
            </nav>

            <div className="grid items-start gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
               <div>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">
                     <span className="text-primary">Project</span>
                     <span aria-hidden="true">·</span>
                     <span className={p.status === 'Completed' ? 'text-success' : 'text-warning'}>{p.status}</span>
                     <span aria-hidden="true">·</span>
                     <span>{new Date(p.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </p>

                  <h1 className="mt-4 text-title text-foreground">{p.title}</h1>

                  <p className="mt-5 max-w-2xl font-serif text-[19px] leading-[1.55] text-muted-foreground sm:text-[22px]">
                     {p.shortDescription}
                  </p>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                     {p.demoUrl && (
                        <Button asChild size="lg" className="gap-2">
                           <a href={p.demoUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" /> Try it live
                           </a>
                        </Button>
                     )}
                     {p.githubUrl && (
                        <Button variant="outline" size="lg" asChild className="gap-2">
                           <a href={p.githubUrl} target="_blank" rel="noopener noreferrer">
                              <Github className="h-4 w-4" /> See the code
                           </a>
                        </Button>
                     )}
                  </div>
               </div>

               <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-border">
                  {p.thumbnailImage ? (
                     <Image src={p.thumbnailImage} alt={p.title} fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" priority />
                  ) : (
                     <SiteIconCell kind="projects" iconSize={110} className="absolute inset-0" />
                  )}
               </div>
            </div>
         </Container>
      </Section>

      {/* Main Content Layout */}
      <Section className="py-12 md:py-20">
         <Container>
            <div className="grid gap-12 lg:grid-cols-[1fr_380px] lg:gap-16">
               {/* Left Column: Content */}
               <div className="space-y-16">
                  {/* Gallery Section */}
                  {p.images && p.images.length > 0 && (
                     <div className="space-y-6">
                        <h2 className="text-eyebrow text-muted-foreground">Gallery</h2>
                        <div className="overflow-hidden rounded-xl">
                            <ProjectGallery images={p.images} />
                        </div>
                     </div>
                  )}

                  {/* About / Description */}
                  <div className="space-y-6">
                     <h2 className="font-serif text-[clamp(1.75rem,3.5vw,2.25rem)] font-medium tracking-[-0.02em]">About this project</h2>
                     <div className="prose prose-lg dark:prose-invert max-w-none 
                        prose-headings:font-serif prose-headings:font-medium prose-headings:tracking-tight prose-p:font-serif prose-p:text-[19px] prose-p:leading-[1.65] prose-p:text-foreground prose-li:font-serif prose-li:text-[19px] prose-a:text-foreground prose-a:decoration-primary prose-a:underline-offset-4 hover:prose-a:text-primary prose-img:rounded-xl prose-img:border prose-img:border-border prose-pre:bg-card
                     ">
                        <ReactMarkdown 
                          remarkPlugins={[...remarkPlugins, remarkBreaks]}
                          rehypePlugins={rehypePlugins}
                          components={{
                            code({ node, inline, className, children, ...props }: any) {
                               const match = /language-(\w+)/.exec(className || '')
                               const isMermaid = match && match[1] === 'mermaid'
  
                               if (!inline && isMermaid) {
                                  return (
                                    <div className="my-8 p-4 flex justify-center">
                                        <MermaidDiagram code={String(children).replace(/\n$/, '')} />
                                    </div>
                                  )
                               }
  
                               return !inline && match ? (
                                  <div className="relative group">
                                      <div className="absolute right-2 top-2 px-2 py-1 text-xs font-mono text-muted-foreground bg-card rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                          {match[1]}
                                      </div>
                                      <code className={className} {...props}>
                                        {children}
                                      </code>
                                  </div>
                               ) : (
                                  <code className={`${className} bg-muted px-1.5 py-0.5 rounded text-sm font-medium text-foreground font-mono`} {...props}>
                                     {children}
                                  </code>
                               )
                            }
                          }}
                        >
                           {preserveSpacing(p.longDescription || '')}
                        </ReactMarkdown>
                     </div>
                  </div>

                  {/* Challenges & Learnings */}
                  {(p.challenges || p.learnings) && (
                      <div className="space-y-10">
                         {p.challenges && (
                            <div>
                               <div className="flex items-center gap-3 mb-4">
                                  <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                                  <h3 className="font-serif text-2xl font-medium text-foreground">What was hard</h3>
                               </div>
                               <p className="pl-8 font-serif text-[19px] leading-[1.65] text-foreground">
                                  {p.challenges}
                               </p>
                            </div>
                         )}
                         
                         {p.learnings && (
                            <div>
                               <div className="flex items-center gap-3 mb-4">
                                  <Lightbulb className="h-5 w-5 text-muted-foreground" />
                                  <h3 className="font-serif text-2xl font-medium text-foreground">What I learned</h3>
                               </div>
                               <p className="pl-8 font-serif text-[19px] leading-[1.65] text-foreground">
                                  {p.learnings}
                               </p>
                            </div>
                         )}
                      </div>
                  )}
               </div>

               {/* Right Column: Sidebar */}
               <div className="space-y-8">
                  {/* Sticky wrapper if content is long enough */}
                  <div className="sticky top-24 space-y-10 rounded-xl border border-border bg-card p-6">
                      
                      {/* Project Stats */}
                      <div>
                         <h3 className="mb-4 text-eyebrow text-muted-foreground">Project stats</h3>
                         <div className="grid grid-cols-2 gap-6">
                            <div>
                               <div className="mb-1 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                                  <Eye className="w-3.5 h-3.5" /> Views
                               </div>
                               <div className="font-serif text-[28px] font-medium leading-none">
                                  {p.views || 0}
                               </div>
                            </div>
                            <div>
                               <div className="mb-1 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                                  <Code2 className="w-3.5 h-3.5" /> Language
                               </div>
                               <div className="truncate font-mono text-base">
                                  {p.techStack?.[0] || 'N/A'}
                               </div>
                            </div>
                            {p.githubStats && (
                               <>
                                  <div>
                                     <div className="mb-1 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                                        <Star className="w-3.5 h-3.5" /> Stars
                                     </div>
                                     <div className="font-serif text-[28px] font-medium leading-none">
                                        {p.githubStats.stars || 0}
                                     </div>
                                  </div>
                                  <div>
                                     <div className="mb-1 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                                        <GitFork className="w-3.5 h-3.5" /> Forks
                                     </div>
                                     <div className="font-serif text-[28px] font-medium leading-none">
                                        {p.githubStats.forks || 0}
                                     </div>
                                  </div>
                               </>
                            )}
                         </div>
                      </div>

                      {/* Tech Stack */}
                      <div>
                         <h3 className="mb-4 text-eyebrow text-muted-foreground">Technologies</h3>
                         <TechStackBadges techStack={p.techStack || []} size="md" className="gap-2" />
                      </div>

                      {/* Team */}
                      {p.teamMembers && p.teamMembers.length > 0 && (
                         <div>
                            <h3 className="mb-4 text-eyebrow text-muted-foreground">Team</h3>
                            <div className="space-y-4">
                               {p.teamMembers.map((member: any, i: number) => (
                                  <div key={i} className="flex items-start gap-4">
                                     <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card font-serif text-base text-foreground">
                                        {member.name.charAt(0)}
                                     </div>
                                     <div className="flex-1 min-w-0 pt-0.5">
                                        <p className="truncate text-sm font-semibold text-foreground">{member.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                                     </div>
                                  </div>
                               ))}
                            </div>
                         </div>
                      )}
                  </div>
               </div>
            </div>
         </Container>
      </Section>
    </div>
  );
}
