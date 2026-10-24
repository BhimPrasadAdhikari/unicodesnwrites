import { glyphFor, GLYPHS } from '@/components/ui/Glyph';
import { connectDB } from '@/lib/db/connection';
import { Post } from '@/lib/models/Post';
import { renderOgCard } from '@/lib/og/card';
import { livePostFilter } from '@/lib/utils/post-visibility';

// next/og is too large for the Edge bundle on this plan (see app/opengraph-image.tsx).
export const runtime = 'nodejs';

/** Share image for a post without its own cover. Looked up by slug so the text is always ours. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return new Response('Not found', { status: 404 });
  }

  await connectDB();
  const post = await Post.findOne({ slug, ...livePostFilter() })
    .select('title category readingTime')
    .lean<{ title: string; category?: string; readingTime?: number }>();
  if (!post) return new Response('Not found', { status: 404 });

  const kind = glyphFor(post.category);
  return renderOgCard({
    kind,
    eyebrow: post.category || GLYPHS[kind].name,
    title: post.title,
    footer: post.readingTime ? `${post.readingTime} min read · Bhim Prasad Adhikari` : 'Bhim Prasad Adhikari',
  });
}
