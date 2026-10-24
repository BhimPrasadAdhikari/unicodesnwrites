import React from 'react';
import { Html, Head, Body, Container, Section, Text, Button, Hr, Link, Preview } from '@react-email/components';

interface ConfirmationEmailProps {
  confirmUrl: string;
}

export const ConfirmationEmail: React.FC<ConfirmationEmailProps> = ({ confirmUrl }) => {
  return (
    <Html>
      <Head />
      <Preview>Confirm your subscription to unicodesnwrites</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
             <Text style={logo}>unicodesnwrites</Text>
          </Section>
          <Section style={content}>
            <Text style={heading}>Please confirm your subscription</Text>
            <Text style={paragraph}>
              Thanks for signing up for our newsletter! We&apos;re excited to share our latest articles on AI, machine learning, and software development with you.
            </Text>
            <Text style={paragraph}>
              To start receiving emails, please confirm your email address by clicking the button below:
            </Text>
            <Section style={btnContainer}>
              <Button style={button} href={confirmUrl}>
                Confirm Subscription
              </Button>
            </Section>
            <Text style={paragraph}>
              This link will expire in 7 days. If you didn&apos;t sign up for this newsletter, you can safely ignore this email.
            </Text>
          </Section>
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              &copy; {new Date().getFullYear()} unicodesnwrites. All rights reserved.
            </Text>
            <Text style={footerText}>
              <Link href="https://unicodesnwrites.tech" style={link}>Visit Website</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
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
  color: '#8b5cf6', // Violet-500
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
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '12px',
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

export default ConfirmationEmail;
