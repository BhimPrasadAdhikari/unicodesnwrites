import { SiteIcon } from '@/components/ui/SiteIcon';
import { NewsletterSignupInline } from './NewsletterSignupInline';

interface NewsletterCTAStripProps {
  /** Fetched on the server so the band renders without a client-side waterfall */
  subscriberCount: number;
}

/** Newsletter band: the one ink panel on the home page, with the envelope icon and the sign-up form. */
export function NewsletterCTAStrip({ subscriberCount }: NewsletterCTAStripProps) {
  return (
    <section id="letters" aria-label="Newsletter sign-up" className="bg-foreground text-background">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 sm:py-20 md:px-8 lg:grid-cols-2 lg:gap-12">
        <div className="flex items-start gap-5 sm:gap-7">
          <SiteIcon kind="newsletter" size={64} className="hidden shrink-0 sm:block" />
          <div className="flex flex-col gap-3.5">
            <p className="font-mono text-[12px] tracking-[0.08em] text-background/60">
              NEWSLETTER · {subscriberCount > 0 ? `${subscriberCount.toLocaleString()} ${subscriberCount === 1 ? 'READER' : 'READERS'}` : 'FREE'}
            </p>
            <h2 className="font-serif text-[clamp(1.875rem,4vw,3rem)] font-medium leading-[1.05] tracking-[-0.02em]">
              Get one helpful email when there&apos;s something new.
            </h2>
            <p className="text-base leading-[1.6] text-background/70">
              New articles, courses and guides. It&apos;s free, and you can unsubscribe any time.
            </p>
          </div>
        </div>
        <NewsletterSignupInline source="homepage" tone="inverse" />
      </div>
    </section>
  );
}
