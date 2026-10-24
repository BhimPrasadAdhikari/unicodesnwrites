import Link from 'next/link';
import Image from 'next/image';
import { Eye, Star, GitFork } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { CoverPlaceholder } from '@/components/ui/CoverPlaceholder';
import { IProject } from '@/lib/models/Project';

interface ProjectCardProps {
  project: IProject;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.slug}`} className="group block h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground/40">
        <div className="relative aspect-[16/10] overflow-hidden border-b border-border">
          {project.thumbnailImage ? (
            <Image src={project.thumbnailImage} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
          ) : (
            <CoverPlaceholder kind="builds" />
          )}
          <Badge
            variant={project.status === 'Completed' ? 'success' : project.status === 'In Progress' ? 'warning' : 'neutral'}
            className="absolute right-3 top-3 bg-card"
          >
            {project.status}
          </Badge>
        </div>
        <div className="flex flex-1 flex-col gap-2.5 p-5">
          <p className="font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">{project.category}</p>
          <h3 className="line-clamp-2 font-serif text-[21px] font-medium leading-[1.2] text-foreground group-hover:text-primary">{project.title}</h3>
          <p className="line-clamp-2 text-[15px] leading-[1.6] text-muted-foreground">{project.shortDescription}</p>
          <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4 font-mono text-[12px] text-muted-foreground">
            <span className="truncate">{(project.techStack || []).slice(0, 3).join(' · ')}</span>
            <span className="flex shrink-0 items-center gap-3">
              {project.githubStats?.stars !== undefined ? <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" />{project.githubStats.stars}</span> : null}
              {project.githubStats?.forks !== undefined ? <span className="flex items-center gap-1"><GitFork className="h-3.5 w-3.5" />{project.githubStats.forks}</span> : null}
              <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{project.views || 0}</span>
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
