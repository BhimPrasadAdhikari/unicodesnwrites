import Link from 'next/link';
import Image from 'next/image';

import { GlyphCell } from '@/components/ui/Glyph';

type CourseCardProps = {
  course: {
    title: string;
    slug: string;
    eyebrow: string;
    summary: string;
    topic: string;
    level: string;
    coverImage: string;
    tags: string[];
    lessonCount: number;
    durationMinutes: number;
    featured: boolean;
  };
};

const formatTopic = (topic: string) => topic.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground/40"
    >
      <div className="relative aspect-[16/10] overflow-hidden border-b border-border">
        {course.coverImage ? (
          <Image src={course.coverImage} alt="" fill sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" className="object-cover" unoptimized />
        ) : (
          <GlyphCell kind="courses" label={`COURSE · ${course.level.toUpperCase()}`} glyphSize={72} className="absolute inset-0" />
        )}
        {course.featured ? (
          <span className="absolute right-3 top-3 rounded-md bg-primary px-2 py-0.5 font-mono text-[11px] tracking-[0.06em] text-primary-foreground">FEATURED</span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-5 sm:p-6">
        <p className="font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">
          {course.eyebrow || formatTopic(course.topic)} · {course.level}
        </p>
        <h2 className="font-serif text-[22px] font-medium leading-[1.18] tracking-[-0.01em] text-foreground group-hover:text-primary sm:text-2xl">{course.title}</h2>
        <p className="line-clamp-3 text-[15px] leading-[1.6] text-muted-foreground">{course.summary}</p>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4 font-mono text-[12px] text-muted-foreground">
          <span>{course.lessonCount} LESSONS · {Math.max(1, Math.round(course.durationMinutes / 60))} H</span>
          <span className="font-sans text-sm font-medium text-foreground underline decoration-primary decoration-2 underline-offset-4">Open course</span>
        </div>
      </div>
    </Link>
  );
}
