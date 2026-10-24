import React from 'react';
import { Html, Head, Body, Container, Section, Text, Button, Hr, Link, Preview } from '@react-email/components';

interface WelcomeEmailProps {
  unsubscribeUrl: string;
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({ unsubscribeUrl }) => {
  return (
    <Html>
      <Head />
      <Preview>Welcome to unicodesnwrites Newsletter!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
             <Text style={logo}>unicodesnwrites</Text>
          </Section>
          <Section style={content}>
            <Text style={heading}>Welcome aboard! 👋</Text>
            <Text style={paragraph}>
              Thank you for confirming your subscription. You&apos;re now officially on the list!
            </Text>
            <Text style={paragraph}>
              Here&apos;s what you can expect from us:
            </Text>
            <ul style={list}>
              <li style={listItem}>Weekly insights on Software Development</li>
              <li style={listItem}>Tutorials on AI and Machine Learning</li>
              <li style={listItem}>Updates on our latest projects and products</li>
            </ul>
            <Text style={paragraph}>
              While you wait for the next issue, feel free to check out our latest articles on the blog.
            </Text>
            <Section style={btnContainer}>
              <Button style={button} href="https://unicodesnwrites.tech/blog">
                Read Latest Articles
              </Button>
            </Section>
          </Section>
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              &copy; {new Date().getFullYear()} unicodesnwrites. All rights reserved.
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

// Styles (reused from confirmation)
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
  margin: '30px 0',
  color: '#1f2937',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#4b5563',
  marginBottom: '20px',
};

const list = {
  marginBottom: '20px',
  paddingLeft: '20px',
  color: '#4b5563',
};

const listItem = {
  marginBottom: '10px',
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
  display: 'inline-block',
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

export default WelcomeEmail;
