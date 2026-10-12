import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '../../../components/Nav';
import Footer from '../../../components/Footer';
import { getGames, getPrices, getWeeks } from '@/lib/snes/data';
import { SNES_BASE } from '@/lib/snes/routes';
import TimeMachineData from '../../../snes/components/TimeMachineData';
import SnesCredit from '../../../snes/components/SnesCredit';
import { buildTimeMachineProps } from '@/lib/snes/tmProps';
import { fraktur, vt323 } from '../../../snes/fonts';
import '../../../snes/snes.css';

export const metadata: Metadata = {
  title: 'SNES Time Machine',
  description: 'Every week of the Super Nintendo era: the #1 song, album and movie, the news, and the games on the shelf.',
  openGraph: {
    title: 'SNES Time Machine',
    description: 'Every week of the Super Nintendo era: the #1 song, album and movie, the news, and the games on the shelf.',
    url: '/videogames/snes-history/time-machine',
    images: [{ url: '/og-snes.jpg', width: 1200, height: 630, alt: 'Every US SNES game, 1991–1998: a wall of box art beside the title' }],
  },
  twitter: { card: 'summary_large_image', title: 'SNES Time Machine', description: 'Every week of the Super Nintendo era: the #1 song, album and movie, the news, and the games on the shelf.', images: ['/og-snes.jpg'] },
  robots: { index: false, follow: false },
};

export default function TimeMachinePage() {
  const props = buildTimeMachineProps({ games: getGames(), weeks: getWeeks(), prices: getPrices() });
  return (
    <>
      <Nav theme />
      <main className={`wb wb-page ${vt323.variable} ${fraktur.variable}`}>
        <div className="s-wrap">
          <header className="s-hero">
            <div className="eyebrow"><Link href={SNES_BASE}>The Super Nintendo in America</Link></div>
            <h1>SNES Time Machine</h1>
            <p>Every week from launch day, August 23, 1991, to the last cart in 1998: the #1 song, album and movie, what was in the news, and what was new on the shelf.</p>
          </header>
          <TimeMachineData {...props} />
          <SnesCredit pop cpi />
        </div>
      </main>
      <Footer />
    </>
  );
}
