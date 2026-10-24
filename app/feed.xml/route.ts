import { siteConfig } from '@/lib/config/site.config';
import { connectDB } from '@/lib/db/connection';
import { Post } from '@/lib/models/Post';
import { livePostFilter } from '@/lib/utils/post-visibility';

// Rendered per request (no DB at build time); the CDN caches it via Cache-Control below.
export const dynamic = 'force-dynamic';

const baseUrl = `https://${siteConfig.domain}`;

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

type FeedPost = {
  slug: string;
  title: string;
  excerpt?: string;
  category?: string;
  tags?: string[];
  coverImage?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export async function GET() {
  let posts: FeedPost[] = [];
  try {
    await connectDB();
    posts = await Post.find(livePostFilter())
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(50)
      .select('slug title excerpt category tags coverImage publishedAt createdAt updatedAt')
      .lean<FeedPost[]>();
  } catch (error) {
    console.error('Failed to build RSS feed', error);
  }

  const items = posts
    .map((post) => {
      const url = `${baseUrl}/blog/${post.slug}`;
      const date = new Date(post.publishedAt || post.createdAt).toUTCString();
      const categories = [post.category, ...(post.tags || [])]
        .filter(Boolean)
        .map((name) => `      <category>${escapeXml(String(name))}</category>`)
        .join('\n');
      const image = post.coverImage
        ? `\n      <enclosure url="${escapeXml(new URL(post.coverImage, baseUrl).toString())}" type="image/jpeg" length="0" />`
        : '';
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${date}</pubDate>
      <description>${escapeXml(post.excerpt || '')}</description>
      <dc:creator>${escapeXml(siteConfig.author.name)}</dc:creator>
${categories}${image}
    </item>`;
    })
    .join('\n');

  const lastBuild = posts[0] ? new Date(posts[0].updatedAt).toUTCString() : new Date().toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(siteConfig.name)}</title>
    <link>${baseUrl}</link>
    <description>${escapeXml(siteConfig.description)}</description>
    <language>en</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400',
    },
  });
}
