import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/db/connection';
import { Post, IPost } from '@/lib/models/Post';
import BlogPostEditor from '@/components/cms/BlogPostEditor';
import { isValidObjectId } from 'mongoose';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  await connectDB();
  const post = await Post.findById(id).lean();

  if (!post) {
    notFound();
  }

  // Convert MongoDB document to plain object
  const typedPost = post as unknown as IPost;
  const postData = {
    title: typedPost.title,
    slug: typedPost.slug,
    content: typedPost.content,
    excerpt: typedPost.excerpt,
    coverImage: typedPost.coverImage || '',
    category: typedPost.category,
    tags: typedPost.tags,
    published: typedPost.published,
    publishedAt: typedPost.publishedAt ? new Date(typedPost.publishedAt).toISOString() : '',
    seoTitle: typedPost.seoTitle || '',
    seoDescription: typedPost.seoDescription || '',
    seoKeywords: typedPost.seoKeywords || [],
    seriesId: typedPost.seriesId?.toString() || '',
    seriesPart: typedPost.seriesPart,
  };

  return (
    <div className="pb-16">
      <DashboardPageHeader eyebrow="Content Publishing" title={`Edit: ${typedPost.title}`} description="Refine article content, interactive components, search metadata, and publication status." />
      <BlogPostEditor postId={id} initialData={postData} />
    </div>
  );
}
