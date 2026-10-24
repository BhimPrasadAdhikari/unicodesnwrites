import { Glyph } from '@/components/ui/Glyph';
import { NewsletterSignupInline } from './NewsletterSignupInline';

interface NewsletterCTAStripProps {
  /** Fetched on the server so the band renders without a client-side waterfall */
  subscriberCount: number;
}

/** Letters band: the one ink panel on the home page, with ¶ and the sign-up form. */
export function NewsletterCTAStrip({ subscriberCount }: NewsletterCTAStripProps) {
  return (
    <section id="letters" aria-label="Newsletter sign-up" className="bg-foreground text-background">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 sm:py-20 md:px-8 lg:grid-cols-2 lg:gap-12">
        <div className="flex items-start gap-5 sm:gap-7">
          <Glyph kind="letters" size={64} className="hidden shrink-0 sm:block" />
          <div className="flex flex-col gap-3.5">
            <p className="font-mono text-[12px] tracking-[0.08em] text-background/60">
              LETTERS · {subscriberCount > 0 ? `${subscriberCount.toLocaleString()} READERS` : 'DOUBLE OPT-IN'}
            </p>
            <h2 className="font-serif text-[clamp(1.875rem,4vw,3rem)] font-medium leading-[1.05] tracking-[-0.02em]">
              One useful email when there is something worth sharing.
            </h2>
            <p className="text-base leading-[1.6] text-background/70">
              New dissections, build logs, courses and tool releases. Unsubscribe at any time.
            </p>
          </div>
        </div>
        <NewsletterSignupInline source="homepage" tone="inverse" />
      </div>
    </section>
  );
}
