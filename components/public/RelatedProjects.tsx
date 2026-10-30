import React from 'react';
import { connectDB } from '@/lib/db/connection';
import { Project } from '@/lib/models/Project';
import ProjectCard from './ProjectCard';

interface RelatedProjectsProps {
  currentProjectSlug: string;
  category: string;
}

export default async function RelatedProjects({ currentProjectSlug, category }: RelatedProjectsProps) {
  await connectDB();
  
  const relatedProjects = await Project.find({
     category,
     slug: { $ne: currentProjectSlug },
     published: true
  })
  .sort({ views: -1 })
  .limit(3)
  .lean();

  if (relatedProjects.length === 0) return null;
  
  const serializedProjects = relatedProjects.map((p: any) => ({
    ...p,
    _id: p._id.toString(),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    author: p.author?.toString() || '',
  }));

  return (
    <section className="py-16 relative overflow-hidden">
       {/* Background */}
       <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
       <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
       
       <div className="relative max-w-6xl mx-auto px-6 md:px-8">
           <div className="mb-8">
             <p className="text-eyebrow text-primary">More projects</p>
             <h2 className="mt-2 font-serif text-[clamp(1.75rem,3.5vw,2.5rem)] font-medium tracking-[-0.02em]">Related projects</h2>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {serializedProjects.map(p => (
                   <ProjectCard key={p._id} project={p} />
               ))}
           </div>
       </div>
    </section>
  );
}
