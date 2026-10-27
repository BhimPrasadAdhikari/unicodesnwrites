import React from 'react';
import { Html, Head, Body, Container, Section, Text, Button, Hr, Link, Preview } from '@react-email/components';

interface UnsubscribeConfirmationEmailProps {
  resubscribeUrl: string;
}

export const UnsubscribeConfirmationEmail: React.FC<UnsubscribeConfirmationEmailProps> = ({ resubscribeUrl }) => {
  return (
    <Html>
      <Head />
      <Preview>You have been unsubscribed</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
             <Text style={logo}>unicodesnwrites</Text>
          </Section>
          <Section style={content}>
            <Text style={heading}>You&apos;ve been unsubscribed</Text>
            <Text style={paragraph}>
              We&apos;re sorry to see you go. You have been successfully removed from our mailing list and will no longer receive emails from us.
            </Text>
            <Text style={paragraph}>
              If this was a mistake, or if you change your mind, you can resubscribe at any time:
            </Text>
            <Section style={btnContainer}>
              <Button style={button} href={resubscribeUrl}>
                Resubscribe
              </Button>
            </Section>
          </Section>
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              &copy; {new Date().getFullYear()} unicodesnwrites. All rights reserved.
            </Text>
            <Text style={footerText}>
              <Link href="https://www.unicodesnwrites.tech" style={link}>Visit Website</Link>
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
};

const header = {
  padding: '24px',
  textAlign: 'center' as const,
};

const logo = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#8b5cf6',
};

const content = {
  padding: '0 24px',
};

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '30px 0',
  color: '#1f2937',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#4b5563',
  marginBottom: '20px',
  textAlign: 'center' as const,
};

const btnContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#8b5cf6',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  padding: '12px 24px',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
};

const footer = {
  textAlign: 'center' as const,
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

export default UnsubscribeConfirmationEmail;
