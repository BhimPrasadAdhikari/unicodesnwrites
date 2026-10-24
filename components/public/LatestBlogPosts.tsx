import Link from "next/link"

import { Container } from "@/components/ui/Section"
import { SectionHeading } from "@/components/ui/SectionHeading"
import { GLYPHS, glyphFor } from "@/components/ui/Glyph"
import { WritingList, type WritingItem } from "@/components/public/WritingList"
import { connectDB } from "@/lib/db/connection"
import { Post, IPost } from "@/lib/models/Post"
import { Series, ISeries } from "@/lib/models/Series"

type HomeListItem = 
  | { type: 'post'; sortDate: Date; data: IPost }
  | { type: 'series'; sortDate: Date; data: ISeries & { partCount: number } };
import { livePostFilter } from '@/lib/utils/post-visibility';

async function getLatestItems(): Promise<HomeListItem[]> {
  try {
    await connectDB()
    
    // Fetch all recent published posts + series
    const [allPosts, seriesList] = await Promise.all([
      Post.find(livePostFilter())
        .sort({ publishedAt: -1 })
        .populate("author", "name")
        .lean() as unknown as IPost[],
      Series.find({ published: true })
        .sort({ createdAt: -1 })
        .limit(3)
        .lean() as unknown as ISeries[],
    ])

    // Build a Set of ALL series IDs (as strings) for reliable comparison
    const allSeriesIdStrings = new Set(
      (await Series.find().select('_id').lean()).map((s) => s._id.toString())
    );

    // Partition: standalone vs series parts (using string comparison)
    const standalonePosts = allPosts.filter(
      (p) => !p.seriesId || !allSeriesIdStrings.has(p.seriesId.toString())
    ).slice(0, 6)

    // Augment series using JS filtering (avoids ObjectId/string type mismatch)
    const augmentedSeries = seriesList.map((s) => {
      const seriesIdStr = s._id.toString();
      const seriesPosts = allPosts.filter(
        (p) => p.seriesId && p.seriesId.toString() === seriesIdStr
      );
      const latestPost = seriesPosts[0]; // already sorted by publishedAt desc
      return {
        ...s,
        partCount: seriesPosts.length,
        latestPublishedAt: (latestPost?.publishedAt ?? s.createdAt) as Date,
      };
    });

    // Merge and sort
    const items: HomeListItem[] = [
      ...standalonePosts.map(p => ({
        type: 'post' as const,
        sortDate: p.publishedAt ? new Date(p.publishedAt) : new Date(p.createdAt),
        data: p
      })),
      ...augmentedSeries.map(s => ({
        type: 'series' as const,
        sortDate: new Date(s.latestPublishedAt),
        data: s
      }))
    ].sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())
    
    return JSON.parse(JSON.stringify(items.slice(0, 6)))
  } catch (error) {
    console.error("Failed to fetch latest items", error)
    return []
  }
}

function toWritingItem(item: HomeListItem): WritingItem {
  if (item.type === 'series') {
    const series = item.data
    const kind = glyphFor(`${series.title} ${series.description ?? ''}`)
    return {
      key: `series-${series._id}`,
      href: `/blog/series/${series.slug}`,
      kind,
      label: `${GLYPHS[kind].name.toUpperCase()} · SERIES · ${series.partCount} PARTS`,
      title: series.title,
      dek: series.description || 'A multi-part guide and exploration.',
    }
  }
  const post = item.data
  const kind = glyphFor(post.category)
  return {
    key: String(post._id),
    href: `/blog/${post.slug}`,
    kind,
    label: [GLYPHS[kind].name.toUpperCase(), post.readingTime ? `${post.readingTime} MIN` : null].filter(Boolean).join(' · '),
    title: post.title,
    dek: post.excerpt,
  }
}

export async function LatestBlogPosts() {
  const items = await getLatestItems()

  return (
    <section id="writing" className="py-16 sm:py-20">
      <Container className="flex flex-col gap-7">
        <SectionHeading eyebrow="§ Latest writing" title="Latest from the notebook" href="/blog" linkLabel="All writing" />
        {items.length > 0 ? (
          <WritingList items={items.map(toWritingItem)} />
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10">
            <p className="font-serif text-2xl font-medium">The next breakdown is in progress.</p>
            <p className="mt-2 max-w-xl text-muted-foreground">Paper dissections, ML build logs and agent guides will appear here.</p>
            <Link href="/blog" className="mt-4 inline-flex min-h-11 items-center text-[15px] font-medium underline decoration-primary decoration-2 underline-offset-4">Browse the archive →</Link>
          </div>
        )}
      </Container>
    </section>
  )
}
