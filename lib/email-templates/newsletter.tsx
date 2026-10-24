import React from 'react';
import { Html, Head, Body, Container, Section, Text, Hr, Link, Preview } from '@react-email/components';

interface NewsletterEmailProps {
  subject: string;
  content: string; // HTML content from editor
  previewText?: string;
  unsubscribeUrl: string;
  /** Physical mailing address required by anti-spam law (e.g. CAN-SPAM); omitted when not configured. */
  postalAddress?: string;
}

export const NewsletterEmail: React.FC<NewsletterEmailProps> = ({ subject, content, previewText, unsubscribeUrl, postalAddress }) => {
  return (
    <Html>
      <Head />
      <Preview>{previewText || subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>unicodesnwrites</Text>
          </Section>
          
          <Section style={contentContainer}>
             {/* Using dangerouslySetInnerHTML to render the rich text content from editor */}
             <div dangerouslySetInnerHTML={{ __html: content }} />
          </Section>

          <Hr style={hr} />
          
          <Section style={footer}>
            <Text style={footerText}>
              &copy; {new Date().getFullYear()} unicodesnwrites.
            </Text>
            {postalAddress && (
              <Text style={footerText}>
                {postalAddress}
              </Text>
            )}
            <Text style={footerText}>
              You are receiving this email because you subscribed to our newsletter.
            </Text>
            <Text style={footerText}>
              <Link href={unsubscribeUrl} style={link}>Unsubscribe</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#f9fafb',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '24px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #e5e7eb',
};

const logo = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#8b5cf6',
};

const contentContainer = {
  padding: '24px',
  color: '#374151',
  lineHeight: '1.6',
  fontSize: '16px',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
};

const footer = {
  textAlign: 'center' as const,
  padding: '0 20px',
};

const footerText = {
  fontSize: '12px',
  color: '#9ca3af',
  marginBottom: '10px',
};

const link = {
  color: '#8b5cf6',
  textDecoration: 'underline',
};

export default NewsletterEmail;
