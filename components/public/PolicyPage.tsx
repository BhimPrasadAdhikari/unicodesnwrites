import AnalyticsTracker from '@/components/analytics/AnalyticsTracker';
import { Section, Container } from '@/components/ui/Section';
import { BusinessDetails, LegalNav } from '@/components/public/LegalNav';
import { businessConfig } from '@/lib/config/business';

export interface PolicySection {
  title: string;
  paragraphs?: string[];
  list?: string[];
}

export function PolicyPage({ path, event, title, updated, summary, sections }: {
  path: string;
  event: string;
  title: string;
  updated: string;
  summary: string;
  sections: PolicySection[];
}) {
  return (
    <div className="flex flex-col">
      <AnalyticsTracker event={event} />

      <Section className="pb-10 pt-10 md:pt-14">
        <Container>
          <div className="mx-auto max-w-3xl">
            <LegalNav current={path} />
            <h1 className="text-title text-foreground">{title}</h1>
            <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">Last updated {updated}</p>
            <div className="mt-8 rounded-xl border border-foreground bg-card px-5 py-4">
              <p className="text-eyebrow text-muted-foreground">In short</p>
              <p className="mt-2 font-serif text-[19px] leading-[1.55] text-foreground">{summary}</p>
            </div>
          </div>
        </Container>
      </Section>

      <Section className="pb-24 pt-4">
        <Container>
          <div className="mx-auto max-w-3xl space-y-12">
            {sections.map((section, index) => (
              <div key={section.title}>
                <h2 className="mb-4 font-serif text-[26px] font-medium leading-tight tracking-[-0.01em] text-foreground">
                  {index + 1}. {section.title}
                </h2>
                <div className="space-y-3 font-serif text-[18px] leading-[1.65] text-foreground sm:text-[19px]">
                  {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.list && (
                    <ul className="space-y-2">
                      {section.list.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}

            <div>
              <h2 className="mb-4 font-serif text-[26px] font-medium leading-tight tracking-[-0.01em] text-foreground">
                {sections.length + 1}. Contact
              </h2>
              <p className="font-serif text-[18px] leading-[1.65] text-foreground sm:text-[19px]">
                Write to us with your order ID and the email used at checkout. We reply within two working days.
              </p>
              <BusinessDetails {...businessConfig} website={businessConfig.parentWebsite} />
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}
