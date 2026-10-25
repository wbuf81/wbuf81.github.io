import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import './design-system.css';
import { THEME_BOOT_SCRIPT } from '@/lib/theme';

// The fonts are in app/fonts/, cut from Google's own files by scripts/fonts/fetch-fonts.py, so a build never
// downloads anything (on 25 Oct 2026 an answer from Google Fonts that Next.js couldn't read failed the deploy).
// A variable face's weight range is the weights the site loaded from Google, so a bolder request still stops at
// the heaviest of them. Serif faces size their fallback against Times New Roman, the rest against Arial.
// Turbopack names each family after its variable, so none may be called serif, sans or mono: a family named
// "serif" is the generic serif the moment anything drops its quotes.

// Playfair and Outfit are only for the pages that keep their own look, so they aren't preloaded everywhere.
const playfair = localFont({
  src: './fonts/playfair-display.woff2',
  weight: '400 900',
  variable: '--font-playfair',
  display: 'swap',
  preload: false,
  adjustFontFallback: 'Times New Roman',
});

const outfit = localFont({
  src: './fonts/outfit.woff2',
  weight: '100 900',
  variable: '--font-outfit',
  display: 'swap',
  preload: false,
});

// The design system's three faces (app/design-system.css reads them as --serif, --sans, --mono).
// Playfair and Outfit stay for the pages that keep their own look (/health, /lee, /articles).
const sourceSerif = localFont({
  src: './fonts/source-serif-4.woff2',
  weight: '500 600',
  variable: '--font-serif',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
});

const plexSans = localFont({
  src: './fonts/ibm-plex-sans.woff2',
  weight: '400 600',
  variable: '--font-sans',
  display: 'swap',
});

const plexMono = localFont({
  src: [
    { path: './fonts/ibm-plex-mono-400.woff2', weight: '400' },
    { path: './fonts/ibm-plex-mono-500.woff2', weight: '500' },
  ],
  variable: '--font-mono',
  display: 'swap',
});

// What link previews (LinkedIn, Slack, iMessage) show under the title: the homepage intro's first two
// sentences, in Wes's voice (4 Oct 2026). LinkedIn caches it; re-fetch with its Post Inspector after a change.
// The homepage card's address. LinkedIn keeps an image by its address, so bump ?v= whenever
// public/og-image.png is redrawn, or it goes on showing the old one (or a blank box).
const OG_IMAGE = '/og-image.png?v=3';

const DESCRIPTION =
  "I work in compliance, and before that I spent 12 years as an engineer. These days I'm all in on building with AI agents.";

export const metadata: Metadata = {
  title: 'Wesley Bard',
  description: DESCRIPTION,
  // The canonical host. Relative URLs in OpenGraph/Twitter cards resolve
  // against this, so it has to be the custom domain, not the github.io origin.
  metadataBase: new URL('https://wesleybard.com'),
  manifest: '/manifest.json',
  openGraph: {
    title: 'Wesley Bard',
    description: DESCRIPTION,
    url: 'https://wesleybard.com',
    siteName: 'Wesley Bard',
    locale: 'en_US',
    type: 'website',
    // PNG, not SVG: iMessage, Teams, Slack, LinkedIn and WhatsApp all ignore
    // SVG previews and fall back to a bare card. Rebuild with
    // `python3 scripts/og/build-og.py main`.
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Wesley Bard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wesley Bard',
    description: DESCRIPTION,
    images: [OG_IMAGE],
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
  description: DESCRIPTION,
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
      className={`${playfair.variable} ${outfit.variable} ${sourceSerif.variable} ${plexSans.variable} ${plexMono.variable}`}
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
