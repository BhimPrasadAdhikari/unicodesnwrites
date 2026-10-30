'use client';

import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

import { CourseCard } from '@/components/public/CourseCard';

type CatalogCourse = React.ComponentProps<typeof CourseCard>['course'];

export function CourseCatalog({ courses }: { courses: CatalogCourse[] }) {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('all');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesLevel = level === 'all' || course.level === level;
      const haystack = [course.title, course.summary, course.topic, ...course.tags].join(' ').toLowerCase();
      return matchesLevel && (!normalized || haystack.includes(normalized));
    });
  }, [courses, level, query]);

  return (
    <div>
      <div className="mb-8 grid gap-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:grid-cols-[1fr_auto]">
        <label className="flex items-center gap-3 rounded-xl bg-muted/55 px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="sr-only">Search courses</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search courses, e.g. chatbots or LLMs…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="sr-only">Course level</span>
          <select value={level} onChange={(event) => setLevel(event.target.value)} className="bg-transparent outline-none">
            <option value="all">All levels</option>
            <option value="foundation">Foundation</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
      </div>

      {filtered.length ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((course) => <CourseCard key={course.slug} course={course} />)}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border bg-muted/25 px-6 py-20 text-center">
          <h2 className="text-xl font-medium">No courses match yet.</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Try another word or level. New courses are added from time to time.</p>
        </div>
      )}
    </div>
  );
}
