import type { Metadata } from 'next';

import { CourseCatalog } from '@/components/public/CourseCatalog';
import { Container } from '@/components/ui/Section';
import { SiteIconCell } from '@/components/ui/SiteIcon';
import { listPublishedCourses } from '@/lib/services/course-platform';
import { siteConfig } from '@/lib/config/site.config';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Courses',
  alternates: { canonical: '/courses' },
  description: 'Free, step-by-step AI courses for beginners and up. Learn how machine learning, large language models (LLMs), retrieval and AI agents work, one short lesson at a time.',
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
              <p className="text-eyebrow text-primary">Courses</p>
              <h1 className="mt-3 text-title">Learn AI step by step.</h1>
              <p className="mt-5 max-w-2xl text-[17px] leading-[1.6] text-muted-foreground sm:text-lg">Short lessons that explain how AI works, from the basics up. Watch a video, read the notes, try a quick quiz, and see how much you have learned.</p>
              <p className="mt-6 font-mono text-[12px] tracking-[0.06em] text-muted-foreground">SHORT LESSONS · QUICK QUIZZES · YOUR OWN NOTES</p>
            </div>
            <SiteIconCell kind="courses" iconSize={110} className="hidden h-[220px] w-[220px] rounded-3xl border border-border lg:flex" />
          </div>
        </Container>
      </section>

      <Container className="max-w-[1440px] py-12 sm:py-16">
        <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div><p className="text-eyebrow text-primary">All courses</p><h2 className="mt-2 font-serif text-[clamp(1.75rem,3.5vw,2.5rem)] font-medium tracking-[-0.02em]">Pick a course to start</h2></div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">Each course explains the big ideas behind AI in plain words, so you understand how it works, not just how to use it.</p>
        </div>
        <CourseCatalog courses={courses} />
      </Container>
    </div>
  );
}
