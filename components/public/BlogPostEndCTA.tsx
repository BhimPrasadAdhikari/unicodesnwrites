'use client';

import { motion } from 'framer-motion';
import { SiteIcon } from '@/components/ui/SiteIcon';
import NewsletterSignupForm from './NewsletterSignupForm';

/**
 * BlogPostEndCTA
 *
 * Replaces the minimal newsletter form at the end of every blog post with a
 * more engaging card that capitalises on the post-completion state.
 * Uses the existing NewsletterSignupForm (card variant) for full form logic.
 */
export default function BlogPostEndCTA() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="mt-16 rounded-3xl border border-border bg-card p-6 sm:p-8"
    >
      <div className="mb-5 flex items-start gap-4">
        <SiteIcon kind="newsletter" size={40} className="mt-1 shrink-0 text-foreground" />
        <div>
          <p className="text-eyebrow text-primary">You made it to the end</p>
          <h2 className="mt-2 font-serif text-[26px] font-medium leading-[1.15] text-foreground">
            Get one helpful email when there&apos;s something new.
          </h2>
        </div>
      </div>

      <p className="mb-6 max-w-lg text-[15px] leading-[1.6] text-muted-foreground">
        New articles, courses and guides. It&apos;s free. You&apos;ll get a quick email to confirm, and you can unsubscribe any time.
      </p>

      <NewsletterSignupForm source="blog-post-end" variant="card" />
    </motion.div>
  );
}
