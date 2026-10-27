import React from 'react';
import NewsletterSignupForm from '@/components/public/NewsletterSignupForm';
import { Metadata } from 'next';
import dbConnect from '@/lib/db/connection';
import Newsletter, { INewsletter } from '@/lib/models/Newsletter';
import Link from 'next/link';
import { format } from 'date-fns';
import { Glyph } from '@/components/ui/Glyph';
import AnalyticsTracker from '@/components/analytics/AnalyticsTracker';
import { Section, Container } from '@/components/ui/Section';

export const metadata: Metadata = {
    title: 'Newsletter',
    alternates: { canonical: '/newsletter' },
    description: 'A thoughtful dispatch about applied AI, machine learning, and building useful products.',
};

export default async function NewsletterPage() {
    let newsletters: INewsletter[] = [];
    try {
        await dbConnect();
        newsletters = await Newsletter.find({ status: 'sent' })
            .sort({ sentAt: -1 })
            .select('subject previewText sentAt slug')
            .limit(20)
            .lean() as unknown as INewsletter[];
    } catch (error) {
        console.error('Failed to load newsletter archive', error);
    }

    return (
        <div className="flex flex-col">
            <AnalyticsTracker event="newsletter_page_view" />
            
            {/* Hero + signup: side by side on wide screens so the form sits above the fold */}
            <Section className="border-b border-border pb-12 pt-12 md:pb-16 md:pt-16">
                <Container>
                    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14">
                        <div className="flex gap-6">
                            <Glyph kind="letters" size={72} className="hidden shrink-0 sm:block" />
                            <div>
                                <p className="text-eyebrow text-primary">§ Letters</p>
                                <h1 className="mt-3 text-title text-foreground">
                                    One useful email when there is something worth sharing.
                                </h1>
                                <p className="mt-5 max-w-2xl text-[17px] leading-[1.6] text-muted-foreground sm:text-lg">
                                    New dissections, build logs, courses and tool releases. No schedule to fill, no filler.
                                </p>
                            </div>
                        </div>
                        <div className="w-full rounded-3xl border border-border bg-card p-5 sm:p-7 lg:mt-2">
                            <NewsletterSignupForm source="newsletter-page" />
                        </div>
                    </div>
                </Container>
            </Section>

            {/* Archive Section */}
            <Section className="py-12 md:py-16">
                <Container>
                    <div className="mx-auto max-w-3xl">
                        <p className="text-eyebrow text-primary">The archive</p>
                        <h2 className="mt-2 font-serif text-[clamp(1.75rem,3.5vw,2.5rem)] font-medium tracking-[-0.02em] text-foreground">Every issue sent</h2>

                        {newsletters.length === 0 ? (
                            <div className="mt-8 rounded-xl border border-dashed border-border bg-card px-6 py-12">
                                <p className="font-serif text-xl font-medium">No issues sent yet.</p>
                                <p className="mt-2 text-muted-foreground">Subscribe above to get the first one.</p>
                            </div>
                        ) : (
                            <ol className="mt-6 border-t border-border">
                                {newsletters.map((post) => (
                                    <li key={post._id.toString()}>
                                        <Link href={`/newsletter/${post._id}`} className="group block border-b border-border py-6">
                                            <time dateTime={post.sentAt?.toString()} className="font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">
                                                {post.sentAt && format(new Date(post.sentAt), 'MMMM d, yyyy')}
                                            </time>
                                            <h3 className="mt-2 font-serif text-[22px] font-medium leading-[1.2] text-foreground group-hover:text-primary">
                                                {post.subject}
                                            </h3>
                                            {post.previewText && (
                                                <p className="mt-2 line-clamp-2 text-[15px] leading-[1.6] text-muted-foreground">
                                                    {post.previewText}
                                                </p>
                                            )}
                                        </Link>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>
                </Container>
            </Section>
        </div>
    );
}
