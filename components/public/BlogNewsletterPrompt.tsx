'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { SiteIcon } from '@/components/ui/SiteIcon';
import { NewsletterSignupInline } from './NewsletterSignupInline';

/**
 * BlogNewsletterPrompt
 *
 * Renders an invisible sentinel div that, once visible in the viewport,
 * slides in a compact newsletter prompt card. Designed to appear roughly
 * mid-way through a long-form blog post (>5 min read).
 *
 * Usage: drop <BlogNewsletterPrompt /> anywhere inside a blog post layout —
 * the parent decides the insertion point (e.g. after a certain paragraph).
 */
export default function BlogNewsletterPrompt() {
  const ref = useRef<HTMLDivElement>(null);
  // trigger once when 20% of the element enters the viewport
  const isInView = useInView(ref, { once: true, margin: '0px 0px -20% 0px' });

  return (
    <div ref={ref} className="my-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="not-prose rounded-xl border border-border bg-card p-5 sm:p-6"
      >
        <div className="mb-4 flex items-start gap-3.5">
          <SiteIcon kind="newsletter" size={32} className="mt-0.5 text-foreground" />
          <div>
            <p className="text-eyebrow text-primary">Newsletter</p>
            <p className="mt-1 font-serif text-xl font-medium leading-snug text-foreground">
              Enjoying this? Get the next article by email.
            </p>
          </div>
        </div>

        <NewsletterSignupInline source="blog-post-inline" />
      </motion.div>
    </div>
  );
}
