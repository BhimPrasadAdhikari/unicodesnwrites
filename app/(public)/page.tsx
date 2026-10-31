import type { Metadata } from 'next';

import { CoursesAndTools } from '@/components/public/CoursesAndTools';
import { FeaturedProjects } from '@/components/public/FeaturedProjects';
import { GlyphStrip } from '@/components/public/GlyphStrip';
import { LatestBlogPosts } from '@/components/public/LatestBlogPosts';
import { NewsletterCTAStrip } from '@/components/public/NewsletterCTAStrip';
import { PublicationHero } from '@/components/public/PublicationHero';
import { connectDB } from '@/lib/db/connection';
import { siteConfig } from '@/lib/config/site.config';
import Subscriber from '@/lib/models/Subscriber';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name} | Learn AI, explained simply` },
  alternates: { canonical: '/' },
  description: siteConfig.description,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: `https://${siteConfig.domain}`,
    siteName: siteConfig.name,
    title: `${siteConfig.name} | Learn AI, explained simply`,
    description: siteConfig.description,
  },
  twitter: {
    card: 'summary_large_image',
    site: '@unique_adhi',
    creator: '@unique_adhi',
  },
};

async function getSubscriberCount(): Promise<number> {
  try {
    await connectDB();
    return await Subscriber.countDocuments({ status: 'confirmed' });
  } catch {
    return 0;
  }
}

export default async function Home() {
  const subscriberCount = await getSubscriberCount();

  return (
    <>
      <PublicationHero />
      <GlyphStrip />
      <LatestBlogPosts />
      <CoursesAndTools />
      <FeaturedProjects />
      <NewsletterCTAStrip subscriberCount={subscriberCount} />
    </>
  );
}
