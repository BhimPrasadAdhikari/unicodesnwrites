import type { Metadata } from 'next';

import { CourseCatalog } from '@/components/public/CourseCatalog';
import { Container } from '@/components/ui/Section';
import { GlyphCell } from '@/components/ui/Glyph';
import { listPublishedCourses } from '@/lib/services/course-platform';
import { siteConfig } from '@/lib/config/site.config';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'AIML Courses',
  alternates: { canonical: '/courses' },
  description: 'Concept-first learning paths for understanding language models, retrieval, agents, evaluation, and modern AI and ML systems.',
};

export default async function CoursesPage() {
  const courses = await listPublishedCourses().catch(() => []);
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'AIML courses',
    numberOfItems: courses.length,
    itemListElement: courses.map((course, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `https://${siteConfig.domain}/courses/${course.slug}`,
      name: course.title,
    })),
  };

  return (
    <div className="pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
      <section className="border-b border-border py-14 sm:py-20">
        <Container className="max-w-[1440px]">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div className="max-w-3xl">
              <p className="text-eyebrow text-primary">§ Courses</p>
              <h1 className="mt-3 text-title">Learn modern AI from first principles.</h1>
              <p className="mt-5 max-w-2xl text-[17px] leading-[1.6] text-muted-foreground sm:text-lg">Build durable mental models for neural networks, LLMs, retrieval and agents. Watch the lesson, read the notes, take the quiz, run the code, then explain it back in your own words.</p>
              <p className="mt-6 font-mono text-[12px] tracking-[0.06em] text-muted-foreground">GUIDED PATHS · DEEP CONCEPTS · A NOTEBOOK THAT TALKS BACK</p>
            </div>
            <GlyphCell kind="courses" glyphSize={110} className="hidden h-[220px] w-[220px] rounded-3xl border border-border lg:flex" />
          </div>
        </Container>
      </section>

      <Container className="max-w-[1440px] py-12 sm:py-16">
        <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div><p className="text-eyebrow text-primary">Catalog</p><h2 className="mt-2 font-serif text-[clamp(1.75rem,3.5vw,2.5rem)] font-medium tracking-[-0.02em]">Choose a mental model to build</h2></div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">No generic coding tracks. Every path is focused on the ideas, architectures, trade-offs, and reasoning behind AIML systems.</p>
        </div>
        <CourseCatalog courses={courses} />
      </Container>
    </div>
  );
}
