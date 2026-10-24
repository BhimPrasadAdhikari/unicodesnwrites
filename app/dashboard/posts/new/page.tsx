import BlogPostEditor from '@/components/cms/BlogPostEditor';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';

export default function NewPostPage() {
  return (
    <div className="pb-16">
      <DashboardPageHeader eyebrow="Content Publishing" title="New blog post" description="Draft an article, add interactive explanations and code walkthroughs, and prepare publication metadata." />
      <BlogPostEditor />
    </div>
  );
}
