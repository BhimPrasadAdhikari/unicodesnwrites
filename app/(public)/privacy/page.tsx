import Link from 'next/link';
import { Metadata } from 'next';
import PrivacyTools from '@/components/public/PrivacyTools';
import AnalyticsTracker from '@/components/analytics/AnalyticsTracker';
import { Section, Container } from '@/components/ui/Section';

export const metadata: Metadata = {
  title: 'Privacy Policy | unicodesnwrites',
  description: 'Our commitment to privacy, data rights, and transparency.',
};

const dataCollected = [
  { label: 'Page Views', description: 'Which pages you visit and the timestamp.' },
  { label: 'Device Information', description: 'Browser type, operating system, and device type (Mobile/Desktop/Tablet) to ensure the site renders correctly.' },
  { label: 'Approximate Location', description: 'Country or region inferred from a network address when available. Full addresses are not retained in publication analytics.' },
  { label: 'Referrer', description: 'The website that linked you to us (e.g., Google, Twitter, LinkedIn).' },
];

const dataUsage = [
  'To see which articles are most popular',
  'To optimize the site for the devices my audience uses',
  'To detect and prevent malicious bots or DDoS attacks',
];

const serviceProviders = [
  'Vercel provides hosting and privacy-conscious traffic analytics.',
  'Stripe processes product payments; payment card details never pass through this application.',
  'The configured email provider delivers newsletter, contact, and purchase messages.',
];

export default function PrivacyPage() {
  return (
    <div className="flex flex-col">
      <AnalyticsTracker event="privacy_page_view" />
      
      {/* Hero Section */}
      <Section className="pb-10 pt-10 md:pt-14">
        <Container>
          <div className="mx-auto max-w-3xl">
            <nav aria-label="Legal" className="mb-8 flex gap-1 border-b border-border">
              <Link href="/privacy" aria-current={'page'} className="-mb-px inline-flex h-11 items-center border-b-2 px-3.5 text-[15px] border-primary font-semibold text-foreground">Privacy</Link>
              <Link href="/terms" aria-current={undefined} className="-mb-px inline-flex h-11 items-center border-b-2 px-3.5 text-[15px] border-transparent font-medium text-muted-foreground hover:text-foreground">Terms</Link>
            </nav>
            <h1 className="text-title text-foreground">Privacy Policy</h1>
            <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">Last updated July 18, 2026</p>
            <div className="mt-8 rounded-xl border border-foreground bg-card px-5 py-4">
              <p className="text-eyebrow text-muted-foreground">In short</p>
              <p className="mt-2 font-serif text-[19px] leading-[1.55] text-foreground">Transparent tracking, no hidden scripts, and full control over your data. We believe privacy is a fundamental right.</p>
            </div>
          </div>
        </Container>
      </Section>

      {/* Privacy Sections */}
      <Section className="pb-24 pt-4">
        <Container>
          <div className="space-y-12 max-w-3xl mx-auto">
            
            {/* Introduction */}
            <div>
              <h2 className="mb-4 font-serif text-[26px] font-medium leading-tight tracking-[-0.01em] text-foreground">1. Introduction</h2>
              <div className="space-y-3 font-serif text-[18px] leading-[1.65] text-foreground sm:text-[19px]">
                <p>
                  unicodesnwrites is designed to collect only the information needed to publish, deliver newsletters, fulfill purchases, and understand whether the publication is useful.
                </p>
                <p>
                  It does not use advertising pixels or cross-site behavioral profiles. Some infrastructure providers process limited technical data to operate the service, as described below.
                </p>
              </div>
            </div>

            {/* What Data We Collect */}
            <div>
              <h2 className="mb-4 font-serif text-[26px] font-medium leading-tight tracking-[-0.01em] text-foreground">2. What Data We Collect</h2>
              <div className="space-y-4 pl-8">
                <p className="text-muted-foreground leading-relaxed">
                  We collect minimal data necessary to improve the website experience:
                </p>
                <div className="space-y-4">
                  {dataCollected.map((item) => (
                    <div key={item.label}>
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* How We Use Data */}
            <div>
              <h2 className="mb-4 font-serif text-[26px] font-medium leading-tight tracking-[-0.01em] text-foreground">3. How We Use Data</h2>
              <ul className="space-y-2 text-muted-foreground pl-8">
                {dataUsage.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="mb-4 font-serif text-[26px] font-medium leading-tight tracking-[-0.01em] text-foreground">4. Service Providers</h2>
              <ul className="space-y-2 pl-8 text-muted-foreground">
                {serviceProviders.map((item) => <li key={item} className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{item}</li>)}
              </ul>
            </div>

            {/* Cookies & Local Storage */}
            <div>
              <h2 className="mb-4 font-serif text-[26px] font-medium leading-tight tracking-[-0.01em] text-foreground">5. Cookies &amp; Local Storage</h2>
              <p className="text-muted-foreground leading-relaxed pl-8">
                The publication does not set advertising cookies. It uses a first-party{' '}
                <span className="font-medium text-foreground">local storage</span> item (<code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">analytics-session-id</code>) to associate reading activity within a session. Authentication, checkout, and infrastructure providers may set strictly necessary cookies for their services.
              </p>
            </div>

            {/* Your Rights - Privacy Tools */}
            <div>
              <h2 className="mb-4 font-serif text-[26px] font-medium leading-tight tracking-[-0.01em] text-foreground">6. Your Controls</h2>
              <div className="space-y-4 pl-8">
                <p className="text-muted-foreground leading-relaxed">
                  In the spirit of transparency, you can view exactly what data is stored for your current session and delete it instantly from our server.
                </p>
                <PrivacyTools />
              </div>
            </div>

            {/* Contact */}
            <div>
              <h2 className="mb-4 font-serif text-[26px] font-medium leading-tight tracking-[-0.01em] text-foreground">7. Contact</h2>
              <p className="text-muted-foreground leading-relaxed pl-8">
                If you have any concerns about your privacy, please send an email to{' '}
                <a
                  href="mailto:contact@unicodesnwrites.tech"
                  className="font-medium text-primary hover:underline"
                >
                  contact@unicodesnwrites.tech
                </a>
              </p>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}
