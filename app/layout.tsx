import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Outfit, Source_Serif_4, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import './design-system.css';
import { THEME_BOOT_SCRIPT } from '@/lib/theme';

// Playfair and Outfit are only for the pages that keep their own look, so they aren't preloaded everywhere.
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  preload: false,
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
  preload: false,
});

// The design system's three faces (app/design-system.css reads them as --serif, --sans, --mono).
// Playfair and Outfit stay for the pages that keep their own look (/health, /lee, /articles).
const serif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-serif',
  display: 'swap',
});

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Wesley Bard',
  description: 'Before: engineer at Lockheed Martin. Now: governance, risk & compliance at Newfold Digital. Still building stuff.',
  // The canonical host. Relative URLs in OpenGraph/Twitter cards resolve
  // against this, so it has to be the custom domain, not the github.io origin.
  metadataBase: new URL('https://wesleybard.com'),
  manifest: '/manifest.json',
  openGraph: {
    title: 'Wesley Bard',
    description: 'Before: engineer at Lockheed Martin. Now: governance, risk & compliance at Newfold Digital. Still building stuff.',
    url: 'https://wesleybard.com',
    siteName: 'Wesley Bard',
    locale: 'en_US',
    type: 'website',
    // PNG, not SVG: iMessage, Teams, Slack, LinkedIn and WhatsApp all ignore
    // SVG previews and fall back to a bare card. Rebuild with
    // `python3 scripts/og/build-og.py main`.
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Wesley Bard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wesley Bard',
    description: 'Before: engineer at Lockheed Martin. Now: governance, risk & compliance at Newfold Digital. Still building stuff.',
    images: ['/og-image.png'],
  },
  other: {
    'theme-color': '#14130f',
  },
};

// Structured data for SEO (Person schema)
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Wesley Bard',
  alternateName: 'Wes',
  description: 'Before: engineer at Lockheed Martin. Now: governance, risk & compliance at Newfold Digital. Still building stuff.',
  url: 'https://wesleybard.com',
  sameAs: [
    'https://www.linkedin.com/in/wesleybard/',
    'https://github.com/wbuf81',
    'https://www.instagram.com/wb81',
  ],
  jobTitle: 'VP, Risk and Compliance',
  knowsAbout: ['Risk Management', 'Compliance', 'AI', 'Engineering'],
};

// No maximum scale or zoom lock: visitors must be able to pinch-zoom (WCAG 1.4.4).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${outfit.variable} ${serif.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies a saved light/dark choice before first paint, so it never flashes. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
