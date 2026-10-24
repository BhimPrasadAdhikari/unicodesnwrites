import Link from 'next/link';
import { connectDB } from '@/lib/db/connection';
import { Post } from '@/lib/models/Post';
import BlogPostList from '@/components/cms/BlogPostList';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import { Plus } from 'lucide-react';
import { findCommittedCampaignsForPosts } from '@/lib/services/newsletter-content';

export default async function BlogPostsPage() {
  await connectDB();

  const posts = await Post.find()
    .sort({ createdAt: -1 })
    .populate('author', 'name email')
    .lean();
    
  // Import Series at top if not there
  const { Series } = await import('@/lib/models/Series');
  const series = await Series.find().lean();
  const emailed = await findCommittedCampaignsForPosts(posts.map((post) => post._id));
  const emailedCampaigns = Object.fromEntries(emailed);

  return (
    <div>
      <DashboardPageHeader
        eyebrow="Content Publishing"
        title="Blog Posts"
        description="Draft, publish, organize, and manage technical blog posts, deep dives, and articles."
        action={
          <Link href="/dashboard/posts/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors">
            <Plus className="h-4 w-4" /> New post
          </Link>
        }
      />

      <BlogPostList posts={JSON.parse(JSON.stringify(posts))} seriesList={JSON.parse(JSON.stringify(series))} emailedCampaigns={emailedCampaigns} />
    </div>
  );
}
