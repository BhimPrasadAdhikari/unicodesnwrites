import { CourseEditor } from '@/components/cms/CourseEditor';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';

export default function NewCoursePage() {
  return <div className="mx-auto max-w-6xl pb-16"><DashboardPageHeader eyebrow="Learning studio" title="New AIML course" description="Build the curriculum, embed your YouTube lessons, and create the learning companion." /><CourseEditor /></div>;
}
