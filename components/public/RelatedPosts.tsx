import { SectionHeading } from '@/components/ui/SectionHeading';
import { connectDB } from '@/lib/db/connection';
import { Post, IPost } from '@/lib/models/Post';
import { User } from '@/lib/models/User';
import BlogCard from '@/components/public/BlogCard';
import { livePostFilter } from '@/lib/utils/post-visibility';

interface RelatedPostsProps {
  currentPostSlug: string;
  category: string;
  tags?: string[];
  seriesId?: string;
  currentPostId?: string;
  currentTitle?: string;
}

export default async function RelatedPosts({
  currentPostSlug,
  category,
  tags = [],
  seriesId,
  currentPostId,
  currentTitle,
}: RelatedPostsProps) {
  await connectDB();

  const selectedPosts: IPost[] = [];
  const selectedSlugs = new Set<string>([currentPostSlug]);

  // 1. Tier 1: Same Series (highest priority for multi-part guides/breakdowns)
  if (seriesId) {
    const seriesIdStr = seriesId.toString();
    const allPublished = (await Post.find({
      ...livePostFilter(),
      slug: { $ne: currentPostSlug },
    })
      .sort({ seriesPart: 1, publishedAt: -1 })
      .populate({ path: 'author', model: User, select: 'name' })
      .lean()) as unknown as IPost[];

    const sameSeriesPosts = allPublished.filter(
      (p) => p.seriesId && p.seriesId.toString() === seriesIdStr
    );

    for (const post of sameSeriesPosts) {
      if (selectedPosts.length >= 3) break;
      selectedPosts.push(post);
      selectedSlugs.add(post.slug);
    }
  }

  // 2. Tier 2: Relevance based on Tags & Title Keywords
  if (selectedPosts.length < 3) {
    const filteredTags = Array.from(
      new Set(tags.filter(Boolean).map((t) => t.toLowerCase()))
    );

    // Extract significant keywords from current title (tokens >= 3 chars, lowercase, excluding common words)
    const stopwords = new Set([
      'the', 'and', 'for', 'with', 'about', 'from', 'this', 'that', 'into',
      'how', 'what', 'why', 'part', 'guide', 'using', 'your', 'build', 'building'
    ]);
    const titleKeywords = currentTitle
      ? currentTitle
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length >= 3 && !stopwords.has(w))
      : [];

    const candidateQuery: Record<string, unknown> = {
      ...livePostFilter(),
      slug: { $nin: Array.from(selectedSlugs) },
    };

    const candidateOr: Record<string, unknown>[] = [];
    if (filteredTags.length > 0) {
      candidateOr.push({ tags: { $in: filteredTags } });
    }
    if (category) {
      candidateOr.push({ category });
    }
    if (titleKeywords.length > 0) {
      const keywordRegex = new RegExp(titleKeywords.map((k) => `\\b${k}\\b`).join('|'), 'i');
      candidateOr.push({ title: { $regex: keywordRegex } });
    }

    if (candidateOr.length > 0) {
      candidateQuery.$or = candidateOr;
    }

    const candidatePosts = (await Post.find(candidateQuery)
      .populate({ path: 'author', model: User, select: 'name' })
      .lean()) as unknown as IPost[];

    // Score candidates by relevance
    const scoredCandidates = candidatePosts.map((post) => {
      let score = 0;
      const postTags = (post.tags || []).map((t) => t.toLowerCase());

      // Shared tags: +10 each
      for (const tag of filteredTags) {
        if (postTags.includes(tag)) {
          score += 10;
        }
      }

      // Title keyword matches: +5 each
      const postTitleLower = (post.title || '').toLowerCase();
      for (const kw of titleKeywords) {
        if (postTitleLower.includes(kw)) {
          score += 5;
        }
      }

      // Category match: +2
      if (post.category === category) {
        score += 2;
      }

      return { post, score };
    });

    // Sort by score desc, publishedAt desc, views desc
    scoredCandidates.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const bDate = b.post.publishedAt ? new Date(b.post.publishedAt).getTime() : 0;
      const aDate = a.post.publishedAt ? new Date(a.post.publishedAt).getTime() : 0;
      if (bDate !== aDate) {
        return bDate - aDate;
      }
      return (b.post.views || 0) - (a.post.views || 0);
    });

    for (const item of scoredCandidates) {
      if (selectedPosts.length >= 3) break;
      if (!selectedSlugs.has(item.post.slug)) {
        selectedPosts.push(item.post);
        selectedSlugs.add(item.post.slug);
      }
    }
  }

  // 3. Tier 3: Fallback to most recent published posts
  if (selectedPosts.length < 3) {
    const fallbackPosts = (await Post.find({
      ...livePostFilter(),
      slug: { $nin: Array.from(selectedSlugs) },
    })
      .sort({ publishedAt: -1, views: -1 })
      .limit(3 - selectedPosts.length)
      .populate({ path: 'author', model: User, select: 'name' })
      .lean()) as unknown as IPost[];

    for (const post of fallbackPosts) {
      if (selectedPosts.length >= 3) break;
      selectedPosts.push(post);
      selectedSlugs.add(post.slug);
    }
  }

  if (selectedPosts.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-5xl px-6 pb-16 lg:px-8">
      <div className="border-t border-border pt-12">
        <SectionHeading icon="articles" eyebrow="Keep reading" title="You might also like" href="/blog" linkLabel="See all articles" className="mb-8" />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {selectedPosts.map((post) => (
            <BlogCard key={post._id.toString()} post={post} variant="vertical" />
          ))}
        </div>
      </div>
    </section>
  );
}
