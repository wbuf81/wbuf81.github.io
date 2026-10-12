import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '../../../components/Nav';
import SnesNav from '../../../snes/components/SnesNav';
import Footer from '../../../components/Footer';
import { getGames } from '@/lib/snes/data';
import { SNES_BASE, TOP8 } from '@/lib/snes/routes';
import { slimIndex } from '@/lib/snes/top8';
import Top8 from '../../../snes/components/Top8';
import SnesCredit from '../../../snes/components/SnesCredit';
import { orbitron, pressStart, vt323 } from '../../../snes/fonts';
import '../../../snes/snes.css';

const description = 'Pick your 8 favorite Super Nintendo games, drag them into order, accept a few friend requests, pick a theme and save the picture.';

export const metadata: Metadata = {
  title: 'My SNES Top 8',
  description,
  openGraph: {
    title: 'My SNES Top 8',
    description,
    url: TOP8,
    images: [{ url: '/og-top8.jpg', width: 1200, height: 630, alt: 'An example Top 8 picture: eight SNES covers in a three-by-three grid, with the words Make your SNES Top 8' }],
  },
  twitter: { card: 'summary_large_image', title: 'My SNES Top 8', description, images: ['/og-top8.jpg'] },
  robots: { index: false, follow: false },
};

export default function Top8Page() {
  return (
    <>
      <Nav theme />
      <main className={`wb wb-page ${pressStart.variable} ${orbitron.variable} ${vt323.variable}`}>
        <SnesNav current="top8" />
        <div className="s-wrap">
          <header className="s-hero">
            <div className="eyebrow"><Link href={SNES_BASE}>The Super Nintendo in America</Link></div>
            <h1>My SNES Top 8</h1>
            <p>{description}</p>
          </header>
          <Top8 games={slimIndex(getGames())} />
          <SnesCredit />
        </div>
      </main>
      <Footer />
    </>
  );
}
