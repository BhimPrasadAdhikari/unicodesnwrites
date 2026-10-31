import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, BookOpen, Github, Lightbulb, Linkedin, ShoppingBag, Wrench } from 'lucide-react';

import AnalyticsTracker from '@/components/analytics/AnalyticsTracker';
import ContactForm from '@/components/public/ContactForm';
import { SocialLink } from '@/components/public/SocialLink';
import { SiteIcon } from '@/components/ui/SiteIcon';
import { Container, Section } from '@/components/ui/Section';
import { siteConfig } from '@/lib/config/site.config';
import { businessConfig } from '@/lib/config/business';
import { BusinessDetails } from '@/components/public/LegalNav';

export const metadata: Metadata = {
  title: 'Contact',
  alternates: { canonical: '/contact' },
  description: 'Get in touch with unicodesnwrites: ask a question, share feedback, get help with a purchase or suggest a topic you want explained.',
};

const conversationStarters = [
  { icon: BookOpen, title: 'Fix or improve an article', detail: 'Spotted a mistake, or something that could be explained more clearly? Tell me.' },
  { icon: Lightbulb, title: 'Suggest a topic', detail: 'An AI idea you find confusing and would like explained simply.' },
  { icon: Wrench, title: 'Work together', detail: 'A project, article or idea you would like to build or write together.' },
  { icon: ShoppingBag, title: 'Help with a purchase', detail: 'A question about something from the shop, a payment or a download.' },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen">
      <AnalyticsTracker event="contact_page_view" />
      <Section className="pb-24 pt-12 md:pt-16">
        <Container>
          <div className="max-w-4xl">
            <p className="text-eyebrow text-primary">Contact</p>
            <h1 className="mt-3 text-title">Say hello.</h1>
            <p className="mt-5 max-w-2xl text-[17px] leading-[1.6] text-muted-foreground sm:text-lg">
              Ask a question, share feedback, get help with a purchase or suggest a topic. A little detail helps me reply faster.
            </p>
          </div>

          <div className="mt-12 grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.75fr)] lg:gap-12">
            <div className="rounded-3xl border border-border bg-card p-5 sm:p-7">
              <div className="mb-6 flex items-start gap-3">
                <SiteIcon kind="newsletter" size={30} className="mt-0.5 shrink-0" />
                <div>
                  <h2 className="font-serif text-2xl font-medium">Send me a message</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">A few sentences is enough.</p>
                </div>
              </div>
              <ContactForm />
            </div>

            <aside>
              <p className="mb-4 text-eyebrow text-muted-foreground">Ways I can help</p>
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
                <p className="text-eyebrow text-muted-foreground">Orders &amp; payments</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  unicodesnwrites is a Lagnever product. Purchases are billed by {businessConfig.legalName}; include your order ID when writing about a payment. See the <Link href="/refund-policy" className="underline underline-offset-2">refund</Link> and <Link href="/shipping-policy" className="underline underline-offset-2">delivery</Link> policies.
                </p>
                <BusinessDetails {...businessConfig} website={businessConfig.parentWebsite} />
              </div>

              <div className="mt-8 border-t border-border pt-6">
                <p className="text-sm leading-6 text-muted-foreground">
                  Want to know more about me, my CV or my work? It is all on the About page.
                </p>
                <Link href="/about" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium underline decoration-primary decoration-2 underline-offset-4 hover:text-primary">About me <ArrowUpRight className="h-4 w-4" /></Link>
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
