'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { SiteIcon } from '@/components/ui/SiteIcon';
import NewsletterSignupForm from './NewsletterSignupForm';

/**
 * Suppression keys:
 *  - localStorage  'nl_subscribed'  = '1'  → user subscribed → never show again
 *  - sessionStorage 'nl_exit_seen'  = '1'  → user dismissed this session → hide until next visit
 *
 * This means non-subscribers will see the popup again on every new browser session,
 * but won't be interrupted twice in the same session.
 */
const SUBSCRIBED_KEY = 'nl_subscribed';
const DISMISSED_KEY  = 'nl_exit_seen';
const MIN_TIME_MS    = 10_000; // 10 seconds on page before it can fire

export default function NewsletterExitIntent() {
  const [open, setOpen] = useState(false);
  const [subscribed, setSubscribed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(SUBSCRIBED_KEY) === '1';
  });

  useEffect(() => {
    // Subscribed users never see it again (persistent)
    if (subscribed) return;
    // Already dismissed this session → wait until next visit
    if (sessionStorage.getItem(DISMISSED_KEY) === '1') return;

    const arrivalTime = Date.now();

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY > 10) return;
      if (Date.now() - arrivalTime < MIN_TIME_MS) return;
      setOpen(true);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [subscribed]);

  /** Dismiss — hide for this session, show again next visit if not subscribed */
  const dismiss = () => {
    setOpen(false);
    sessionStorage.setItem(DISMISSED_KEY, '1');
  };

  /** Subscribe success — permanently suppress */
  const handleSubscribeSuccess = () => {
    setSubscribed(true);
    localStorage.setItem(SUBSCRIBED_KEY, '1');
    setTimeout(() => setOpen(false), 3000);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ── solid dark overlay for strong contrast in both modes */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-foreground/40"
            onClick={dismiss}
            aria-hidden="true"
          />

          {/* ── Modal ── */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: -28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,   scale: 1    }}
            exit={{    opacity: 0, y: -20,  scale: 0.96 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Subscribe to newsletter"
            className="fixed left-1/2 top-[8%] z-50 w-full max-w-md -translate-x-1/2 px-4"
          >
            {/* Solid card — fully opaque in both light and dark mode */}
            <div className="relative rounded-3xl border border-border bg-card shadow-overlay">

              {/* Close (×) button */}
              <button
                onClick={dismiss}
                aria-label="Close"
                className="absolute right-3 top-3 cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="p-8">
                {subscribed ? (
                  /* ── Success state ── */
                  <div className="py-4 text-center">
                    <p className="text-4xl mb-3">🎉</p>
                    <h2 className="text-xl font-medium text-foreground">
                      You&apos;re in!
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Check your inbox for a confirmation link.
                    </p>
                  </div>
                ) : (
                  /* ── Default state ── */
                  <>
                    {/* Label */}
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                        <SiteIcon kind="newsletter" size={24} className="text-foreground" />
                      </div>
                      <span className="text-eyebrow text-muted-foreground">
                        Before you go
                      </span>
                    </div>

                    {/* Heading */}
                    <h2 className="text-2xl font-medium tracking-tight text-foreground">
                      Get simple AI guides by email
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      New articles, courses and guides that explain AI in plain
                      words. It&apos;s free, with no spam.
                    </p>

                    {/* Form — subscribe button uses site primary (blue) */}
                    <div className="mt-6">
                      <NewsletterSignupForm
                        source="homepage"
                        variant="minimal"
                        onSubscribeSuccess={handleSubscribeSuccess}
                      />
                    </div>

                    {/* Decline link — clearly styled as an action */}
                    <button
                      onClick={dismiss}
                      className="mt-5 w-full cursor-pointer text-center text-xs font-medium text-muted-foreground underline underline-offset-4 decoration-muted-foreground/40 transition-colors hover:text-foreground hover:decoration-foreground/60"
                    >
                      No thanks
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

