import { Metadata } from 'next';
import AnalyticsTracker from '@/components/analytics/AnalyticsTracker';
import { Section, Container } from '@/components/ui/Section';
import { BusinessDetails, LegalNav } from '@/components/public/LegalNav';
import { businessConfig } from '@/lib/config/business';

export const metadata: Metadata = {
  title: 'Terms of Service',
  alternates: { canonical: '/terms' },
  description: 'Terms and conditions for using unicodesnwrites.',
};

const sections = [
  {
    title: 'Who We Are',
    content: `unicodesnwrites (${businessConfig.website.replace('https://', '')}) is a publication and digital product store operated by ${businessConfig.legalName}, the business behind ${businessConfig.parentBrand} (lagnever.ai). Purchases, invoices and payment support are handled by ${businessConfig.legalName}, ${businessConfig.postalAddress}.`,
  },
  {
    title: 'Acceptance of Terms',
    content: 'By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement.',
  },
  {
    title: 'Intellectual Property',
    content: 'All content published and made available on this site is the property of Bhim Prasad Adhikari (unicodesnwrites) and the site\'s creators. This includes, but is not limited to images, text, logos, documents, downloadable files and anything that contributes to the composition of this site.',
    extra: 'Code snippets shared in blog posts are generally open source (MIT License) unless otherwise specified. You are free to use them in your projects.',
  },
  {
    title: 'Digital Products',
    content: 'When purchasing digital products (templates, tools, course material) from this site:',
    list: [
      'All prices are listed in Indian rupees (INR, ₹) and include applicable taxes unless stated otherwise.',
      `Payments are processed securely by ${businessConfig.paymentProvider} (UPI, cards, netbanking and wallets). We never see or store your card or bank details.`,
      'You are granted a non-exclusive, non-transferable license to use the product.',
      'You may not redistribute or resell the product itself.',
      'Products are delivered digitally by email and on-screen download right after payment; nothing is shipped physically. See the Delivery Policy.',
      'All payments are final and non-refundable, as on every Lagnever product, except for confirmed duplicate charges, undeliverable orders, or where the law requires a refund. See the Refund & Cancellation Policy.',
      'Buyers under the age of majority must have a parent or guardian approve any payment.',
    ],
  },
  {
    title: 'Newsletter & Communications',
    content: 'By subscribing to our newsletter, you agree to receive emails from us. You can unsubscribe at any time using the link in the email footer. We will never sell your email address.',
  },
  {
    title: 'Limitation of Liability',
    content: `The information provided on this website is for educational and informational purposes only. We are not liable for any actions taken based on the information on this website. To the maximum extent permitted by law, the total liability of ${businessConfig.legalName} is limited to the amount you paid for the product giving rise to the claim. Please verify code before running it in production environments.`,
  },
  {
    title: 'Governing Law',
    content: `These terms are governed by the laws of India. Any disputes are subject to the jurisdiction of ${businessConfig.jurisdiction}.`,
  },
  {
    title: 'Changes to Terms',
    content: 'We reserve the right to modify these terms at any time. We will do our best to ensure that any major changes are communicated clearly.',
  },
];

export default function TermsPage() {
  return (
    <div className="flex flex-col">
      <AnalyticsTracker event="terms_page_view" />
      
      {/* Hero Section */}
      <Section className="pb-10 pt-10 md:pt-14">
        <Container>
          <div className="mx-auto max-w-3xl">
            <LegalNav current="/terms" />
            <h1 className="text-title text-foreground">Terms of Service</h1>
            <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">Last updated October 25, 2026</p>
            <div className="mt-8 rounded-xl border border-foreground bg-card px-5 py-4">
              <p className="text-eyebrow text-muted-foreground">In short</p>
              <p className="mt-2 font-serif text-[19px] leading-[1.55] text-foreground">The rules of the road for using this website. Please read these terms carefully before using our services.</p>
            </div>
          </div>
        </Container>
      </Section>

      {/* Terms Sections */}
      <Section className="pb-24 pt-4">
        <Container>
          <div className="space-y-12 max-w-3xl mx-auto">
            {sections.map((section, index) => {
              return (
                <div key={section.title}>
                  <h2 className="mb-4 font-serif text-[26px] font-medium leading-tight tracking-[-0.01em] text-foreground">
                      {index + 1}. {section.title}
                    </h2>
                  <div className="space-y-3 font-serif text-[18px] leading-[1.65] sm:text-[19px]">
                    <p className="text-foreground">
                      {section.content}
                    </p>
                    {section.extra && (
                      <p className="text-foreground">
                        <span className="font-medium text-foreground">Open Source Code:</span> {section.extra}
                      </p>
                    )}
                    {section.list && (
                      <ul className="space-y-2 text-foreground">
                        {section.list.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Contact Section */}
            <div>
              <h2 className="mb-4 font-serif text-[26px] font-medium leading-tight tracking-[-0.01em] text-foreground">
                  {sections.length + 1}. Questions?
                </h2>
              <p className="font-serif text-[18px] leading-[1.65] text-foreground sm:text-[19px]">
                If you have any questions about these Terms, please contact us at{' '}
                <a
                  href={`mailto:${businessConfig.supportEmail}`}
                  className="underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
                >
                  {businessConfig.supportEmail}
                </a>
              </p>
              <BusinessDetails {...businessConfig} website={businessConfig.parentWebsite} />
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}
