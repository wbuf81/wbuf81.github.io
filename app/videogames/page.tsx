import type { Metadata } from 'next';
import { Nav } from '../components/Nav';
import Footer from '../components/Footer';
import { getGames, getWeeks } from '@/lib/snes/data';
import { slimWeeks } from '@/lib/snes/onThisDay';
import { SNES_BASE, TIME_MACHINE, TOP8 } from '@/lib/snes/routes';
import OnThisDay from '../snes/components/OnThisDay';
import SnesCredit from '../snes/components/SnesCredit';
import { vt323 } from '../snes/fonts';
import '../snes/snes.css';

export const metadata: Metadata = {
  title: 'Video games',
  description: "Wes's video game projects.",
  openGraph: {
    title: 'Video games',
    description: "Wes's video game projects.",
    url: '/videogames',
    images: [{ url: '/og-videogames.jpg', width: 1200, height: 630, alt: 'Video games: gameplay clips, the Omaha World-Pixel, a score scatter and a shelf of SNES covers' }],
  },
  twitter: { card: 'summary_large_image', title: 'Video games', description: "Wes's video game projects.", images: ['/og-videogames.jpg'] },
  robots: { index: false, follow: false },
};

export default function VideoGamesPage() {
  const weeks = slimWeeks(getWeeks(), getGames());
  return (
    <>
      <Nav theme />
      <main className={`wb wb-page ${vt323.variable}`}>
        <div className="s-wrap">
          <header className="s-hero">
            <div className="eyebrow">Video games</div>
            <h1>Video games</h1>
            <p>Projects about the games I grew up with — starting with every Super Nintendo game released in America.</p>
          </header>
          <OnThisDay weeks={weeks} />
          <div className="s-hub">
            <a className="s-hub-card" href={SNES_BASE}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/snes/box/super-mario-world.jpg" alt="" width={300} height={209} />
              <span className="s-hub-t">Super Nintendo history</span>
              <span className="s-hub-p">717 games, 1991–1998 — timeline, cover wall, shelf and more</span>
            </a>
            <a className="s-hub-card" href={TIME_MACHINE}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/snes/pop/unforgettable-with-love.webp" alt="" width={300} height={209} />
              <span className="s-hub-t">SNES Time Machine</span>
              <span className="s-hub-p">Every week, 1991–1998: the #1 song, album and movie, the news, and the new games</span>
            </a>
            <a className="s-hub-card" href={TOP8}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/snes/top8-example.jpg" alt="An example Top 8 picture: a title tile and SNES covers in a three-by-three grid" width={600} height={418} />
              <span className="s-hub-t">My SNES Top 8</span>
              <span className="s-hub-p">Pick your 8 favorites, drag them into order, pick a theme and save the picture</span>
            </a>
            <div className="s-hub-card s-hub-soon">
              <span className="s-hub-t">Coming soon: Wes&apos;s Analogue Pocket run</span>
              <span className="s-hub-p">Played, beaten, rated — my run through the library on an Analogue Pocket.</span>
            </div>
          </div>
          <SnesCredit pop />
        </div>
      </main>
      <Footer />
    </>
  );
}
