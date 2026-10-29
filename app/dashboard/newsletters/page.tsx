import Link from 'next/link';
import { MailPlus, Plus } from 'lucide-react';
import dbConnect from '@/lib/db/connection';
import Newsletter from '@/lib/models/Newsletter';
import NewsletterList from '@/components/cms/NewsletterList';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import { CreateCampaignFromPostsButton } from '@/components/cms/CreateCampaignFromPostsButton';
import { findDigestCandidates } from '@/lib/services/newsletter-content';

export default async function NewslettersPage() {
    await dbConnect();
    
    // Fetch newsletters
    const newsletters = await Newsletter.find({})
        .sort({ updatedAt: -1 })
        .select('-content')
        .lean();
    const digest = await findDigestCandidates();
        
    const serializedNewsletters = newsletters.map((n: any) => ({
        ...n,
        _id: n._id.toString(),
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
        sentAt: n.sentAt?.toISOString(),
        scheduledFor: n.scheduledFor?.toISOString(),
        resumeAfter: n.resumeAfter?.toISOString(),
        author: n.author.toString(),
    }));

    return (
        <div className="space-y-6">
            <DashboardPageHeader
                eyebrow="Email Marketing"
                title="Newsletter Campaigns"
                description="Create, schedule, broadcast, and review newsletter campaigns from one central queue."
                action={
                    <div className="flex flex-wrap items-start gap-2">
                        <Link href="/dashboard/newsletters/welcome" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-secondary transition-colors">
                            <MailPlus className="h-4 w-4" /> Welcome series
                        </Link>
                        <CreateCampaignFromPostsButton mode="digest" candidateCount={digest.posts.length} />
                        <Link href="/dashboard/newsletters/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors">
                            <Plus className="h-4 w-4" /> New campaign
                        </Link>
                    </div>
                }
            />
            
            <NewsletterList newsletters={serializedNewsletters} />
        </div>
    );
}
