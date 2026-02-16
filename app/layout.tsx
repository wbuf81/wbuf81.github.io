import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Outfit } from 'next/font/google';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Wesley Bard — VP, Risk & Compliance',
  description: 'Risk and compliance executive with 20 years of experience spanning Lockheed Martin and Newfold Digital. Engineer. AI Builder.',
  metadataBase: new URL('https://wbuf81.github.io'),
  manifest: '/manifest.json',
  openGraph: {
    title: 'Wesley Bard — VP, Risk & Compliance',
    description: 'Risk and compliance executive with 20 years of experience spanning Lockheed Martin and Newfold Digital. Engineer. AI Builder.',
    url: 'https://wbuf81.github.io',
    siteName: 'Wesley Bard',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'Wesley Bard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wesley Bard — VP, Risk & Compliance',
    description: 'Risk and compliance executive with 20 years of experience spanning Lockheed Martin and Newfold Digital. Engineer. AI Builder.',
    images: ['/og-image.svg'],
  },
  other: {
    'theme-color': '#6366f1',
  },
};

// Structured data for SEO (Person schema)
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Wesley Bard',
  alternateName: 'Wes',
  description: 'Risk and compliance executive with 20 years of experience spanning Lockheed Martin and Newfold Digital. Engineer. AI Builder.',
  url: 'https://wbuf81.github.io',
  sameAs: [
    'https://www.linkedin.com/in/wesleybard/',
    'https://github.com/wbuf81',
    'https://www.instagram.com/wb81',
  ],
  jobTitle: 'VP, Risk and Compliance',
  knowsAbout: ['Risk Management', 'Compliance', 'AI', 'Engineering'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${outfit.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
