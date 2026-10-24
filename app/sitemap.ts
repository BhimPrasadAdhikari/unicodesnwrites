import type { MetadataRoute } from 'next';

import { siteConfig } from '@/lib/config/site.config';
import { connectDB } from '@/lib/db/connection';
import Course from '@/lib/models/Course';
import Newsletter from '@/lib/models/Newsletter';
import { Post } from '@/lib/models/Post';
import Product from '@/lib/models/Product';
import { Project } from '@/lib/models/Project';
import { Series } from '@/lib/models/Series';
import { livePostFilter } from '@/lib/utils/post-visibility';

export const dynamic = 'force-dynamic';

const baseUrl = `https://${siteConfig.domain}`;
const staticRoutes: MetadataRoute.Sitemap = [
  ['', 'daily', 1],
  ['/courses', 'weekly', 0.95],
  ['/blog', 'daily', 0.9],
  ['/projects', 'weekly', 0.9],
  ['/products', 'weekly', 0.9],
  ['/newsletter', 'weekly', 0.8],
  ['/about', 'monthly', 0.6],
  ['/contact', 'yearly', 0.5],
  ['/privacy', 'yearly', 0.3],
  ['/terms', 'yearly', 0.3],
].map(([path, changeFrequency, priority]) => ({
  url: `${baseUrl}${path}`,
  changeFrequency: changeFrequency as MetadataRoute.Sitemap[number]['changeFrequency'],
  priority: priority as number,
}));

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    await connectDB();
    const [courses, posts, projects, products, newsletters, series] = await Promise.all([
      Course.find({ status: 'published' }).select('slug updatedAt').lean<Array<{ slug: string; updatedAt: Date }>>(),
      Post.find(livePostFilter()).select('slug updatedAt').lean<Array<{ slug: string; updatedAt: Date }>>(),
      Project.find({ published: true }).select('slug updatedAt').lean<Array<{ slug: string; updatedAt: Date }>>(),
      Product.find({ published: true }).select('slug updatedAt').lean<Array<{ slug: string; updatedAt: Date }>>(),
      Newsletter.find({ status: 'sent' }).select('_id sentAt updatedAt').lean<Array<{ _id: { toString(): string }; sentAt?: Date; updatedAt: Date }>>(),
      Series.find({ published: true }).select('slug updatedAt').lean<Array<{ slug: string; updatedAt: Date }>>(),
    ]);

    return [
      ...staticRoutes,
      ...courses.map((item) => ({ url: `${baseUrl}/courses/${item.slug}`, lastModified: item.updatedAt, changeFrequency: 'monthly' as const, priority: 0.9 })),
      ...posts.map((item) => ({ url: `${baseUrl}/blog/${item.slug}`, lastModified: item.updatedAt, changeFrequency: 'monthly' as const, priority: 0.8 })),
      ...series.map((item) => ({ url: `${baseUrl}/blog/series/${item.slug}`, lastModified: item.updatedAt, changeFrequency: 'monthly' as const, priority: 0.75 })),
      ...projects.map((item) => ({ url: `${baseUrl}/projects/${item.slug}`, lastModified: item.updatedAt, changeFrequency: 'monthly' as const, priority: 0.75 })),
      ...products.map((item) => ({ url: `${baseUrl}/products/${item.slug}`, lastModified: item.updatedAt, changeFrequency: 'monthly' as const, priority: 0.8 })),
      ...newsletters.map((item) => ({ url: `${baseUrl}/newsletter/${item._id.toString()}`, lastModified: item.sentAt || item.updatedAt, changeFrequency: 'never' as const, priority: 0.65 })),
    ];
  } catch (error) {
    console.error('Dynamic sitemap data could not be loaded:', error instanceof Error ? error.message : 'unknown error');
    return staticRoutes;
  }
}
