import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { CoverPlaceholder } from '@/components/ui/CoverPlaceholder';
import { glyphFor } from '@/components/ui/Glyph';
import { iconForGlyph, PLAIN_TOPIC, SiteIcon } from '@/components/ui/SiteIcon';
import { ObjectId } from 'mongodb';

interface BlogCardProps {
  post: {
    _id: ObjectId | string;
    title: string;
    slug: string;
    excerpt: string;
    coverImage?: string;
    category: string;
    publishedAt?: string | Date;
    readingTime?: number;
    seriesId?: any;
    seriesPart?: number;
    author: {
      name: string;
    } | any;
  };
  variant?: 'horizontal' | 'vertical';
}

function metaLabel(post: BlogCardProps['post']) {
  const kind = glyphFor(post.category);
  return [
    post.category ? post.category.toUpperCase() : PLAIN_TOPIC[kind].toUpperCase(),
    post.seriesPart ? `PART ${post.seriesPart}` : null,
    `${post.readingTime || 5} MIN READ`,
  ].filter(Boolean).join(' · ');
}

function publishedLabel(publishedAt?: string | Date) {
  return publishedAt ? format(new Date(publishedAt), 'd MMM yyyy') : 'Draft';
}

export default function BlogCard({ post, variant = 'horizontal' }: BlogCardProps) {
  const kind = glyphFor(post.category);

  if (variant === 'vertical') {
    return (
      <Link href={`/blog/${post.slug}`} className="group block h-full">
        <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground/40">
          <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-border">
            {post.coverImage ? (
              <Image src={post.coverImage} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
            ) : (
              <CoverPlaceholder kind={iconForGlyph(kind)} />
            )}
          </div>
          <div className="flex flex-1 flex-col gap-2.5 p-5">
            <p className="font-mono text-[12px] tracking-[0.06em] text-muted-foreground">{metaLabel(post)}</p>
            <h2 className="line-clamp-3 font-serif text-[21px] font-medium leading-[1.2] tracking-[-0.01em] text-foreground group-hover:text-primary">
              {post.title}
            </h2>
            <p className="line-clamp-2 text-[15px] leading-[1.6] text-muted-foreground">{post.excerpt}</p>
            <p className="mt-auto pt-3 text-[13px] text-muted-foreground">{publishedLabel(post.publishedAt)}</p>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="grid grid-cols-[52px_minmax(0,1fr)] items-start gap-4 border-b border-border py-6 sm:grid-cols-[64px_minmax(0,1fr)] sm:gap-5">
        <span className="relative flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-xl border border-border bg-card sm:h-16 sm:w-16">
          {post.coverImage ? (
            <Image src={post.coverImage} alt="" fill sizes="64px" className="object-cover" />
          ) : (
            <SiteIcon kind={iconForGlyph(kind)} size={30} className="group-hover:text-primary" />
          )}
        </span>
        <span className="flex min-w-0 flex-col gap-2">
          <span className="font-mono text-[12px] tracking-[0.06em] text-muted-foreground">{metaLabel(post)}</span>
          <h2 className="font-serif text-[clamp(1.25rem,2vw,1.5625rem)] font-medium leading-[1.2] tracking-[-0.01em] text-foreground group-hover:text-primary">
            {post.title}
          </h2>
          <p className="line-clamp-2 text-[15px] leading-[1.6] text-muted-foreground">{post.excerpt}</p>
          <span className="text-[13px] text-muted-foreground">
            {post.author?.name ? `${post.author.name} · ` : ''}{publishedLabel(post.publishedAt)}
          </span>
        </span>
      </article>
    </Link>
  );
}
