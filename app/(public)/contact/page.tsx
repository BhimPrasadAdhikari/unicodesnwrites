import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, BookOpen, Github, Lightbulb, Linkedin, ShoppingBag, Wrench } from 'lucide-react';

import AnalyticsTracker from '@/components/analytics/AnalyticsTracker';
import ContactForm from '@/components/public/ContactForm';
import { SocialLink } from '@/components/public/SocialLink';
import { Glyph } from '@/components/ui/Glyph';
import { Container, Section } from '@/components/ui/Section';
import { siteConfig } from '@/lib/config/site.config';

export const metadata: Metadata = {
  title: 'Contact | unicodesnwrites',
  description: 'Send feedback, a collaboration idea, or a product support question to unicodesnwrites.',
};

const conversationStarters = [
  { icon: BookOpen, title: 'A note worth improving', detail: 'Corrections, counterexamples, or a concept that deserves a clearer explanation.' },
  { icon: Lightbulb, title: 'An interactive idea', detail: 'A difficult AI or systems concept that would benefit from a hands-on visual lab.' },
  { icon: Wrench, title: 'A thoughtful collaboration', detail: 'A focused build, research, or writing project with clear context and intent.' },
  { icon: ShoppingBag, title: 'Product support', detail: 'A question about a product, purchase, download, or suggested improvement.' },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen">
      <AnalyticsTracker event="contact_page_view" />
      <Section className="pb-24 pt-12 md:pt-16">
        <Container>
          <div className="max-w-4xl">
            <p className="text-eyebrow text-primary">§ Contact</p>
            <h1 className="mt-3 text-title">Send a useful signal.</h1>
            <p className="mt-5 max-w-2xl text-[17px] leading-[1.6] text-muted-foreground sm:text-lg">
              Share feedback on a field note, suggest a concept lab, ask about a product, or propose a focused collaboration. Context makes a thoughtful reply much easier.
            </p>
          </div>

          <div className="mt-12 grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.75fr)] lg:gap-12">
            <div className="rounded-3xl border border-border bg-card p-5 sm:p-7">
              <div className="mb-6 flex items-start gap-3">
                <Glyph kind="letters" size={30} className="mt-0.5 shrink-0" />
                <div>
                  <h2 className="font-serif text-2xl font-medium">Start the conversation</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">A few specific sentences are usually enough.</p>
                </div>
              </div>
              <ContactForm />
            </div>

            <aside>
              <p className="mb-4 text-eyebrow text-muted-foreground">Good reasons to write</p>
              <div className="space-y-3">
                {conversationStarters.map((item) => (
                  <div key={item.title} className="border-b border-border pb-4">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <h3 className="mt-2 font-serif text-lg font-medium">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 border-t border-border pt-6">
                <p className="text-sm leading-6 text-muted-foreground">
                  Looking for biography, résumé, experience, or personal links? Those details now live in the dedicated portfolio.
                </p>
                <Link href="/portfolio" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium underline decoration-primary decoration-2 underline-offset-4 hover:text-primary">About me <ArrowUpRight className="h-4 w-4" /></Link>
              </div>

              <div className="mt-7 flex items-center gap-4">
                <SocialLink href={siteConfig.social.github} platform="github" aria-label="GitHub" className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"><Github className="h-4 w-4" /></SocialLink>
                <SocialLink href={siteConfig.social.linkedin} platform="linkedin" aria-label="LinkedIn" className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"><Linkedin className="h-4 w-4" /></SocialLink>
              </div>
            </aside>
          </div>
        </Container>
      </Section>
    </div>
  );
}
