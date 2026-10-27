import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import { Inter, JetBrains_Mono, Newsreader } from 'next/font/google';

import { siteConfig } from '@/lib/config/site.config';

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} | Visual notes for building useful AI`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: ['Applied AI', 'Machine Learning', 'Interactive Learning', 'Deep Learning', 'Product Engineering', 'Developer Tools'],
  authors: [{ name: siteConfig.author.name }],
  creator: siteConfig.author.name,
  publisher: siteConfig.name,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(`https://${siteConfig.domain}`),
  alternates: {
    types: { 'application/rss+xml': [{ url: '/feed.xml', title: `${siteConfig.name}` }] },
  },
  openGraph: {
    title: `${siteConfig.name} | Visual notes for building useful AI`,
    description: siteConfig.description,
    url: `https://${siteConfig.domain}`,
    siteName: siteConfig.name,
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} | Visual notes for building useful AI`,
    description: siteConfig.description,
    creator: '@unique_adhi',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

// Codepoint's three voices: Newsreader writes, Inter is the tool, JetBrains Mono annotates
const newsreader = Newsreader({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
});
const inter = Inter({ subsets: ['latin', 'latin-ext', 'greek'], variable: '--font-inter', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin', 'greek'], weight: ['400', '500'], variable: '--font-jetbrains-mono', display: 'swap' });

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteConfig.name,
  url: `https://${siteConfig.domain}`,
  description: siteConfig.description,
  publisher: {
    '@type': 'Person',
    name: siteConfig.author.name,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${newsreader.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body
        className="min-h-screen bg-background text-foreground antialiased"
      >
        <Providers>
          {children}
        </Providers>
        
        <Analytics />
        
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        
        {/* Analytics Script */}
        <Script src="/analytics.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
