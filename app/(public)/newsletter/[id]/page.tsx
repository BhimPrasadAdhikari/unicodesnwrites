import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import dbConnect from '@/lib/db/connection';
import Newsletter, { INewsletter } from '@/lib/models/Newsletter';
import { format } from 'date-fns';
import { SiteIcon } from '@/components/ui/SiteIcon';
import Link from 'next/link';
import { isValidObjectId } from 'mongoose';
import SandboxedHtml from '@/components/public/SandboxedHtml';
import newsletterHtmlSanitizer from '@/lib/utils/newsletter-html-sanitizer';

const { sanitizeNewsletterHtml } = newsletterHtmlSanitizer;

interface Props {
    params: { id: string };
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const params = await props.params;
    if (!isValidObjectId(params.id)) return { title: 'Newsletter Not Found' };
    await dbConnect();
    const newsletter = await Newsletter.findOne({ _id: params.id, status: 'sent' }).select('subject previewText').lean();
    if (!newsletter) return { title: 'Newsletter Not Found' };
    
    return {
        title: `${newsletter.subject} · Newsletter`,
        description: newsletter.previewText,
        alternates: { canonical: `/newsletter/${params.id}` },
        openGraph: { title: newsletter.subject, description: newsletter.previewText, type: 'article' },
    };
}

export default async function SingleNewsletterPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    if (!isValidObjectId(params.id)) notFound();
    await dbConnect();
    
    const newsletter = await Newsletter.findById(params.id).lean() as unknown as INewsletter;
    
    if (!newsletter || newsletter.status !== 'sent') {
        notFound();
    }
    
    return (
        <div className="mx-auto w-full max-w-6xl px-6 md:px-8 py-12">
            <div className="max-w-3xl mx-auto">
                <nav aria-label="Breadcrumb" className="mb-8 font-mono text-[12px] tracking-[0.06em] text-muted-foreground">
                    <Link href="/newsletter" className="inline-flex min-h-11 items-center hover:text-foreground">NEWSLETTER</Link>
                    <span aria-hidden="true"> / </span>
                    <span>PAST EMAILS</span>
                </nav>

                <article>
                    <header className="mb-8">
                        <p className="font-mono text-[12px] uppercase tracking-[0.06em] text-primary">
                            Newsletter · <time dateTime={new Date(newsletter.sentAt!).toISOString()}>{format(new Date(newsletter.sentAt!), 'MMMM d, yyyy')}</time>
                        </p>
                        <h1 className="mt-3 text-title">
                            {newsletter.subject}
                        </h1>
                        {newsletter.previewText && (
                            <p className="mt-4 font-serif text-[19px] leading-[1.55] text-muted-foreground sm:text-[22px]">
                                {newsletter.previewText}
                            </p>
                        )}
                    </header>

                    <div className="border-y border-border py-8">
                        <SandboxedHtml html={sanitizeNewsletterHtml(newsletter.content)} title={`${newsletter.subject} content`} />
                    </div>
                    
                    {/* Newsletter Footer / CTA */}
                    <div className="mt-14 flex flex-col gap-5 rounded-3xl bg-foreground p-6 text-background sm:flex-row sm:items-center sm:justify-between sm:p-8">
                        <div className="flex items-start gap-4">
                            <SiteIcon kind="newsletter" size={40} className="shrink-0" />
                            <div>
                                <h2 className="font-serif text-2xl font-medium">Want the next email?</h2>
                                <p className="mt-1 text-[15px] text-background/70">One helpful email when there&apos;s something new. It&apos;s free.</p>
                            </div>
                        </div>
                        <Link
                            href="/newsletter"
                            className="inline-flex h-12 shrink-0 items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                            Subscribe
                        </Link>
                    </div>
                </article>
            </div>
        </div>
    );
}
