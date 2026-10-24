import Link from "next/link"
import Image from "next/image"

import { Container } from "@/components/ui/Section"
import { SectionHeading } from "@/components/ui/SectionHeading"
import { GlyphCell } from "@/components/ui/Glyph"
import { connectDB } from "@/lib/db/connection"
import { Project, IProject } from "@/lib/models/Project"

async function getFeaturedProjects(): Promise<IProject[]> {
  try {
    await connectDB()
    const projects = await Project.find({ 
      featured: true, 
      published: true 
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean()
    
    return JSON.parse(JSON.stringify(projects))
  } catch (error) {
    console.error("Failed to fetch featured projects", error)
    return []
  }
}

export async function FeaturedProjects() {
  const projects = await getFeaturedProjects()
  if (projects.length === 0) return null

  return (
    <section className="border-t border-border bg-secondary/40 py-16 sm:py-20">
      <Container className="flex flex-col gap-8">
        <SectionHeading eyebrow="§ Build logs" title="Machine learning projects I've built" href="/projects" linkLabel="All builds" />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={String(project._id)}
              href={`/projects/${project.slug}`}
              className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground/40"
            >
              <div className="relative aspect-[16/10] border-b border-border">
                {project.thumbnailImage ? (
                  <Image
                    src={project.thumbnailImage}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <GlyphCell kind="builds" className="absolute inset-0" />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2.5 p-5">
                <p className="font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">
                  {[project.category, project.status].filter(Boolean).join(" · ")}
                </p>
                <h3 className="font-serif text-[22px] font-medium leading-[1.2] group-hover:text-primary">{project.title}</h3>
                <p className="line-clamp-3 text-[15px] leading-[1.6] text-muted-foreground">{project.shortDescription}</p>
                {(project.techStack || []).length > 0 ? (
                  <p className="mt-auto pt-2 font-mono text-[12px] text-muted-foreground">{(project.techStack || []).slice(0, 4).join(" · ")}</p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  )
}
